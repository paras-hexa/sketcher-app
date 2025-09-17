// src/Components/canvas/SketchCanvas.jsx
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { observer } from "mobx-react-lite";
import { uiStore } from "../../stores/uistore";
import { SketchStore } from "../../stores/sketchstore";

/**
 * SketchCanvas
 * - Draws shapes from SketchStore
 * - On user interaction it creates/updates shapes in SketchStore
 * - Uses uiStore.activeTool to decide the drawing behavior
 *
 * NOTE: This uses the exact store methods you provided:
 *    SketchStore.addShape(...)
 *    SketchStore.updateShape(id, props)
 *    SketchStore.selectShape(id)
 *    SketchStore.deleteshape(id)  // not used here but available
 *
 * Polyline: click to add points, double-click to finish.
 */

export const SketchCanvas = observer(() => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const objectsRef = useRef(new Map()); // map shapeId => threeObject
  const animRef = useRef(null);

  // drawing state refs (mutable, not causing re-renders)
  const isDrawingRef = useRef(false);
  const currentIdRef = useRef(null);
  const polylineModeRef = useRef(false);

  // helper: convert screen (clientX/clientY) to world coordinates (camera centered at 0,0)
  const screenToWorld = (clientX, clientY, mount) => {
    const rect = mount.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = rect.height / 2 - (clientY - rect.top);
    return { x, y };
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Initialize scene, orthographic camera centered at 0,0 (good for 2D)
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      -1000,
      1000
    );
    camera.position.z = 10;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // optional light / helpers (kept subtle)
    // grid oriented in X-Y plane (visual guidance)
    const grid = new THREE.GridHelper(Math.max(width, height) * 2, 50, 0xeeeeee, 0xdddddd);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);

    // Raycaster for selection
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();

    // Sync shapes -> three objects
    const syncObjects = () => {
      const storeShapes = SketchStore.shapes || [];
      const existingIds = new Set(storeShapes.map((s) => s.id));

      // remove objects that no longer exist in store
      for (const [id, obj] of Array.from(objectsRef.current.entries())) {
        if (!existingIds.has(id)) {
          scene.remove(obj);
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else obj.material.dispose();
          }
          objectsRef.current.delete(id);
        }
      }

      // create or update objects for each shape
      for (const s of storeShapes) {
        if (!objectsRef.current.has(s.id)) {
          // create
          const obj = createThreeObjectForShape(s);
          if (obj) {
            obj.userData = { id: s.id, type: s.type };
            objectsRef.current.set(s.id, obj);
            scene.add(obj);
          }
        } else {
          // update existing object geometry / color / visibility
          const obj = objectsRef.current.get(s.id);
          updateThreeObjectForShape(obj, s);
        }
      }
    };

    // Helper: create Three object for a shape
    const createThreeObjectForShape = (s) => {
      const color = s.color || "#000000";
      if (s.type === "line") {
        const pts = [new THREE.Vector3(s.x1 || 0, s.y1 || 0, 0), new THREE.Vector3(s.x2 || 0, s.y2 || 0, 0)];
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color });
        return new THREE.Line(geom, mat);
      }
      if (s.type === "circle") {
        const r = s.r || 0;
        const curve = new THREE.EllipseCurve(0, 0, r, r, 0, Math.PI * 2, false, 0);
        const pts = curve.getPoints(64).map((p) => new THREE.Vector3(p.x + (s.cx || 0), p.y + (s.cy || 0), 0));
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color });
        return new THREE.LineLoop(geom, mat);
      }
      if (s.type === "ellipse") {
        const rx = s.rx || 0;
        const ry = s.ry || 0;
        const curve = new THREE.EllipseCurve(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
        const pts = curve.getPoints(64).map((p) => new THREE.Vector3(p.x + (s.cx || 0), p.y + (s.cy || 0), 0));
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color });
        return new THREE.LineLoop(geom, mat);
      }
      if (s.type === "polyline") {
        const pts = (s.points || []).map((p) => new THREE.Vector3(p.x || 0, p.y || 0, 0));
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color });
        return new THREE.Line(geom, mat);
      }
      return null;
    };

    // Helper: update existing object's geometry/color/visible based on shape
    const updateThreeObjectForShape = (obj, s) => {
      if (!obj) return;
      obj.visible = s.hidden ? false : true;

      if (s.type === "line" && obj.type === "Line") {
        const positions = new Float32Array([
          s.x1 || 0, s.y1 || 0, 0,
          s.x2 || 0, s.y2 || 0, 0
        ]);
        if (!obj.geometry || obj.geometry.attributes.position.count !== 2) {
          obj.geometry.dispose();
          obj.geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(s.x1 || 0, s.y1 || 0, 0),
            new THREE.Vector3(s.x2 || 0, s.y2 || 0, 0)
          ]);
        } else {
          obj.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
          obj.geometry.attributes.position.needsUpdate = true;
        }
        if (obj.material) obj.material.color.set(s.color || "#000000");
      }

      if (s.type === "circle" && (obj.type === "Line" || obj.type === "LineLoop")) {
        const r = s.r || 0;
        const curve = new THREE.EllipseCurve(0,0,r,r,0,Math.PI*2,false,0);
        const pts = curve.getPoints(64).map((p) => new THREE.Vector3(p.x + (s.cx || 0), p.y + (s.cy || 0), 0));
        obj.geometry.setFromPoints(pts);
        if (obj.material) obj.material.color.set(s.color || "#000000");
      }

      if (s.type === "ellipse" && (obj.type === "Line" || obj.type === "LineLoop")) {
        const rx = s.rx || 0;
        const ry = s.ry || 0;
        const curve = new THREE.EllipseCurve(0,0,rx,ry,0,Math.PI*2,false,0);
        const pts = curve.getPoints(64).map((p) => new THREE.Vector3(p.x + (s.cx || 0), p.y + (s.cy || 0), 0));
        obj.geometry.setFromPoints(pts);
        if (obj.material) obj.material.color.set(s.color || "#000000");
      }

      if (s.type === "polyline" && obj.type === "Line") {
        const pts = (s.points || []).map((p) => new THREE.Vector3(p.x || 0, p.y || 0, 0));
        obj.geometry.setFromPoints(pts);
        if (obj.material) obj.material.color.set(s.color || "#000000");
      }
    };

    // animation loop - sync + render
    const animate = () => {
      syncObjects();
      renderer.render(scene, camera);
      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    // ----- Pointer event handlers -----
    const onPointerDown = (ev) => {
      ev.preventDefault();
      const rect = mount.getBoundingClientRect();
      const { x, y } = screenToWorld(ev.clientX, ev.clientY, mount);

      // selection: if clicked an existing object and not in the middle of a polyline add flow,
      // select it and do not start drawing
      // compute intersects
      mouseNDC.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouseNDC.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseNDC, camera);
      const allObjects = Array.from(objectsRef.current.values());
      const intersects = raycaster.intersectObjects(allObjects, true);

      if (intersects.length > 0 && !isDrawingRef.current && !polylineModeRef.current) {
        const hit = intersects[0].object;
        const id = hit.userData && hit.userData.id;
        if (id) {
          SketchStore.selectShape(id);
          return; // do not start drawing
        }
      }

      // if no active tool -> nothing to do
      if (!uiStore.activeTool) return;

      // DRAW START logic
      // For polyline: if already in polyline mode add a point; else start a new polyline
      const tool = uiStore.activeTool;
      if (tool === "polyline") {
        if (!polylineModeRef.current) {
          // start polyline
          const id = Date.now().toString();
          currentIdRef.current = id;
          polylineModeRef.current = true;
          // create with two same points first (last one is preview)
          SketchStore.addShape({ id, type: "polyline", points: [{ x, y }, { x, y }], color: "#000000" });
          isDrawingRef.current = false; // we'll treat polyline specially
        } else {
          // add a point to the existing polyline
          const id = currentIdRef.current;
          const shape = SketchStore.shapes.find((s) => s.id === id);
          if (shape) {
            const pts = [...(shape.points || []), { x, y }];
            SketchStore.updateShape(id, { points: pts });
          }
        }
        return;
      }

      // Non-polyline tools: start immediate drawing (click+drag)
      isDrawingRef.current = true;
      const id = Date.now().toString();
      currentIdRef.current = id;

      if (tool === "line") {
        SketchStore.addShape({ id, type: "line", x1: x, y1: y, x2: x, y2: y, color: "#000000" });
      } else if (tool === "circle") {
        SketchStore.addShape({ id, type: "circle", cx: x, cy: y, r: 0, color: "#000000" });
      } else if (tool === "ellipse") {
        SketchStore.addShape({ id, type: "ellipse", cx: x, cy: y, rx: 0, ry: 0, color: "#000000" });
      }
    };

    const onPointerMove = (ev) => {
      if (!isDrawingRef.current && !polylineModeRef.current) return;
      ev.preventDefault();
      const mount = mountRef.current;
      if (!mount) return;
      const { x, y } = screenToWorld(ev.clientX, ev.clientY, mount);
      const id = currentIdRef.current;
      if (!id) return;
      const shape = SketchStore.shapes.find((s) => s.id === id);
      if (!shape) return;

      if (shape.type === "line") {
        SketchStore.updateShape(id, { x2: x, y2: y });
      } else if (shape.type === "circle") {
        const dx = x - shape.cx;
        const dy = y - shape.cy;
        const r = Math.sqrt(dx * dx + dy * dy);
        SketchStore.updateShape(id, { r });
      } else if (shape.type === "ellipse") {
        const rx = Math.abs(x - shape.cx);
        const ry = Math.abs(y - shape.cy);
        SketchStore.updateShape(id, { rx, ry });
      } else if (shape.type === "polyline") {
        // update preview last point to current mouse
        const pts = [...(shape.points || [])];
        if (pts.length > 0) {
          pts[pts.length - 1] = { x, y };
          SketchStore.updateShape(id, { points: pts });
        }
      }
    };

    const onPointerUp = (ev) => {
      // finish for non-polyline
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        currentIdRef.current = null;
      }
      // for polyline we don't end on pointerup (double-click ends)
    };

    const onDoubleClick = (ev) => {
      // finish polyline on double click
      if (polylineModeRef.current && uiStore.activeTool === "polyline") {
        const id = currentIdRef.current;
        if (id) {
          // if last point equals previous (preview), it's already placed; finish
          polylineModeRef.current = false;
          currentIdRef.current = null;
          isDrawingRef.current = false;
        }
      }
    };

    // attach events to renderer.domElement to respect canvas area
    renderer.domElement.style.touchAction = "none"; // avoid browser gestures
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("dblclick", onDoubleClick);

    // window resize support
    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // cleanup
    return () => {
      cancelAnimationFrame(animRef.current);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("dblclick", onDoubleClick);
      window.removeEventListener("resize", handleResize);

      // dispose objects
      for (const obj of objectsRef.current.values()) {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      }
      objectsRef.current.clear();

      // renderer dispose & remove canvas
      renderer.dispose();
      if (mount && renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []); // run once on mount

  // UI: show helpful hint when no tool selected
  return (
    <div ref={mountRef} className={`w-full h-full bg-white overflow-hidden`}>
      {/* we render Three canvas into this div */}
      <div
        style={{
          position: "absolute",
          pointerEvents: "none",
          left: 12,
          top: 12,
          background: "rgba(255,255,255,0.6)",
          padding: "6px 8px",
          borderRadius: 6,
          fontSize: 13,
          color: "#444",
        }}
      >
        {uiStore.activeTool ? `Tool: ${uiStore.activeTool}` : "Select a tool"}
      </div>
    </div>
  );
});


