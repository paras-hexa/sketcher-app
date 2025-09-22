import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { observer } from "mobx-react-lite";
import { uiStore } from "../../stores/uistore";
import { SketchStore } from "../../stores/sketchstore";

export const SketchCanvas = observer(() => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const objectsRef = useRef(new Map()); // map shapeId => threeObject
  const animRef = useRef(null);

  // drawing state refs
  const isDrawingRef = useRef(false); // for click-click flow (line/circle/ellipse)
  const currentToolRef = useRef(null); // current tool name at start of draw
  const startPointRef = useRef(null); // start/center for non-polyline shapes
  const tempObjectRef = useRef(null); // temporary preview (Line or Mesh) for non-polyline

  // polyline temp visuals (NOT stored in SketchStore until finish)
  const polylineModeRef = useRef(false);
  const tempPolylinePointsRef = useRef([]); // array of {x,y} for the temp polyline
  const tempPolylineRef = useRef(null); // line showing committed temp polyline segments
  const previewSegmentRef = useRef(null); // dashed segment from last fixed point -> mouse

  // convert screen coords to world coords (for ortho camera centered at 0,0)
  const screenToWorld = (clientX, clientY, mount) => {
    const rect = mount.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = rect.height / 2 - (clientY - rect.top);
    return { x, y };
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // --- scene / camera / renderer ---
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
    camera.position.z = 100;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // raycaster for selection
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();

    // --- helpers: create / update objects for shapes (from store) ---
    const createThreeObjectForShape = (s) => {
      const color = s.color || "#000000";
      const opacity = s.opacity || 1;
      if (s.type === "line") {
        const pts = [
          new THREE.Vector3(s.x1 || 0, s.y1 || 0, 0),
          new THREE.Vector3(s.x2 || 0, s.y2 || 0, 0),
        ];
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
        return new THREE.Line(geom, mat);
      }

      if (s.type === "polyline") {
        const pts = (s.points || []).map((p) => new THREE.Vector3(p.x || 0, p.y || 0, 0));
        const geom = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color, opacity, transparent: true });
        return new THREE.Line(geom, mat);
      }

      if (s.type === "circle") {
        const geom = new THREE.CircleGeometry(1, 64);
        const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(s.cx || 0, s.cy || 0, 0);
        mesh.scale.set(s.r || 0, s.r || 0, 1);
        return mesh;
      }

      if (s.type === "ellipse") {
        const geom = new THREE.CircleGeometry(1, 64);
        const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(s.cx || 0, s.cy || 0, 0);
        mesh.scale.set(s.rx || 0, s.ry || 0, 1);
        return mesh;
      }

      return null;
    };

    const updateThreeObjectForShape = (obj, s) => {
      if (!obj) return;
      obj.visible = !s.hidden;

      if (s.type === "line" && obj.type === "Line") {
        obj.geometry.setFromPoints([
          new THREE.Vector3(s.x1 || 0, s.y1 || 0, 0),
          new THREE.Vector3(s.x2 || 0, s.y2 || 0, 0),
        ]);
        obj.material.color.set(s.color || "#000000");
        obj.material.opacity = s.opacity ?? 0.2;
        obj.material.transparent = true;
        return;
      }

      if (s.type === "polyline" && obj.type === "Line") {
        const pts = (s.points || []).map((p) => new THREE.Vector3(p.x || 0, p.y || 0, 0));
        obj.geometry.setFromPoints(pts);
        obj.material.color.set(s.color || "#000000");
        obj.material.opacity = s.opacity ?? 1;
        obj.material.transparent = true;
        return;
      }

      if ((s.type === "circle" || s.type === "ellipse") && obj.isMesh) {
        obj.position.set(s.cx || 0, s.cy || 0, 0);
        if (s.type === "circle") {
          obj.scale.set(s.r || 0, s.r || 0, 1);
        } else {
          obj.scale.set(s.rx || 0, s.ry || 0, 1);
        }
        obj.material.color.set(s.color || "#000000");
        obj.material.opacity = s.opacity ?? 1;
        obj.material.transparent = true;
        return;
      }
    };

    // sync shapes -> three objects (store is single source for completed shapes)
    const syncObjects = () => {
      const storeShapes = SketchStore.shapes || [];
      const existingIds = new Set(storeShapes.map((s) => s.id));

      // remove deleted shapes
      for (const [id, obj] of Array.from(objectsRef.current.entries())) {
        if (!existingIds.has(id)) {
          scene.remove(obj);
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material.dispose();
          }
          objectsRef.current.delete(id);
        }
      }

      // create or update
      for (const s of storeShapes) {
        if (!objectsRef.current.has(s.id)) {
          const obj = createThreeObjectForShape(s);
          if (obj) {
            obj.userData = { id: s.id, type: s.type };
            objectsRef.current.set(s.id, obj);
            scene.add(obj);
          }
        } else {
          const obj = objectsRef.current.get(s.id);
          updateThreeObjectForShape(obj, s);
        }
      }
    };

    // animation loop
    const animate = () => {
      syncObjects();
      renderer.render(scene, camera);
      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    // --- pointer logic (non-store previews, store only on finalize) ---
    const onPointerDown = (ev) => {
      ev.preventDefault();
      const rect = mount.getBoundingClientRect();
      const { x, y } = screenToWorld(ev.clientX, ev.clientY, mount);

      // selection: if clicked existing object and not mid-draw, select and don't start drawing
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

      const tool = uiStore.activeTool;
      if (!tool) return;

      // ---------- POLYLINE ----------
      if (tool === "polyline") {
        // Start polyline build mode if not already
        if (!polylineModeRef.current) {
          polylineModeRef.current = true;
          tempPolylinePointsRef.current = [{ x, y }]; // first fixed point
          // create temp polyline (visual) with a duplicated point so geometry has 2 points
          const pts = [new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y, 0)];
          const geom = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineBasicMaterial({ color: "#000000" });
          tempPolylineRef.current = new THREE.Line(geom, mat);
          scene.add(tempPolylineRef.current);
        } else {
          // Add a committed point to temp polyline (not in store yet)
          const pts = tempPolylinePointsRef.current;
          // push clicked point as new fixed vertex
          pts.push({ x, y });
          // update temp polyline geometry to show committed points
          const vpts = pts.map((p) => new THREE.Vector3(p.x, p.y, 0));
          tempPolylineRef.current.geometry.dispose();
          tempPolylineRef.current.geometry = new THREE.BufferGeometry().setFromPoints(vpts);

          // remove preview segment (last->mouse) now that we fixed the click
          if (previewSegmentRef.current) {
            scene.remove(previewSegmentRef.current);
            previewSegmentRef.current.geometry.dispose();
            previewSegmentRef.current.material.dispose();
            previewSegmentRef.current = null;
          }
        }
        return;
      }

      // ---------- NON-POLYLINE (line / circle / ellipse) ----------
      // Click-click flow: first click creates temporary preview; second click finalizes (adds to store)
      if (!isDrawingRef.current) {
        // start drawing
        isDrawingRef.current = true;
        currentToolRef.current = tool;
        startPointRef.current = { x, y };

        // create temp preview object (not in store)
        if (tool === "line") {
          const pts = [new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y, 0)];
          const geom = new THREE.BufferGeometry().setFromPoints(pts);
          const mat = new THREE.LineBasicMaterial({ color: "#000000", transparent: true, opacity: 1 });
          tempObjectRef.current = new THREE.Line(geom, mat);
          scene.add(tempObjectRef.current);
        } else if (tool === "circle") {
          const geom = new THREE.CircleGeometry(1, 64);
          const mat = new THREE.MeshBasicMaterial({ color: "#000000", side: THREE.DoubleSide, transparent: true, opacity: 1 });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.set(x, y, 0);
          mesh.scale.set(0.0001, 0.0001, 1); // tiny to start
          tempObjectRef.current = mesh;
          scene.add(tempObjectRef.current);
        } else if (tool === "ellipse") {
          const geom = new THREE.CircleGeometry(1, 64);
          const mat = new THREE.MeshBasicMaterial({ color: "#000000", side: THREE.DoubleSide, transparent: true, opacity: 1 });
          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.set(x, y, 0);
          mesh.scale.set(0.0001, 0.0001, 1);
          tempObjectRef.current = mesh;
          scene.add(tempObjectRef.current);
        }
      } else {
        // second click -> finalize: create shape in SketchStore and remove preview
        const start = startPointRef.current;
        // remove temporary preview from scene first
        if (tempObjectRef.current) {
          scene.remove(tempObjectRef.current);
          if (tempObjectRef.current.geometry) tempObjectRef.current.geometry.dispose();
          if (tempObjectRef.current.material) tempObjectRef.current.material.dispose();
          tempObjectRef.current = null;
        }

        // create store shape (completed)
        const id = Date.now().toString();
        if (currentToolRef.current === "line") {
          SketchStore.addShape({
            id,
            type: "line",
            x1: start.x,
            y1: start.y,
            x2: x,
            y2: y,
            color: "#000000",
            opacity: 1
          });
        } else if (currentToolRef.current === "circle") {
          const r = Math.hypot(x - start.x, y - start.y);
          SketchStore.addShape({
            id,
            type: "circle",
            cx: start.x,
            cy: start.y,
            r,
            color: "#000000",
            opacity: 1
          });
        } else if (currentToolRef.current === "ellipse") {
          const rx = Math.abs(x - start.x);
          const ry = Math.abs(y - start.y);
          SketchStore.addShape({
            id,
            type: "ellipse",
            cx: start.x,
            cy: start.y,
            rx,
            ry,
            color: "#000000",
            opacity: 1
          });
        }

        // reset drawing state
        isDrawingRef.current = false;
        currentToolRef.current = null;
        startPointRef.current = null;
      }
    };

    const onPointerMove = (ev) => {
      // update previews: either click-click preview (non-polyline) or polyline preview segment
      if (!isDrawingRef.current && !polylineModeRef.current) return;
      ev.preventDefault();
      const { x, y } = screenToWorld(ev.clientX, ev.clientY, mount);

      // POLYLINE preview: dashed segment from last fixed point -> mouse
      if (polylineModeRef.current && uiStore.activeTool === "polyline") {
        const pts = tempPolylinePointsRef.current;
        if (!pts || pts.length === 0) return;

        const last = pts[pts.length - 1];
        const geom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(last.x, last.y, 0),
          new THREE.Vector3(x, y, 0),
        ]);

        if (previewSegmentRef.current) {
          previewSegmentRef.current.geometry.dispose();
          previewSegmentRef.current.geometry = geom;
        } else {
          const mat = new THREE.LineDashedMaterial({
            color: 0x0000ff,
            dashSize: 6,
            gapSize: 3,
          });
          const seg = new THREE.Line(geom, mat);
          seg.computeLineDistances();
          scene.add(seg);
          previewSegmentRef.current = seg;
        }
        return;
      }

      // NON-POLYLINE preview: update tempObjectRef using startPointRef
      if (isDrawingRef.current && tempObjectRef.current) {
        const start = startPointRef.current;
        const tool = currentToolRef.current;
        if (tool === "line") {
          tempObjectRef.current.geometry.setFromPoints([
            new THREE.Vector3(start.x, start.y, 0),
            new THREE.Vector3(x, y, 0),
          ]);
        } else if (tool === "circle") {
          const r = Math.hypot(x - start.x, y - start.y);
          tempObjectRef.current.scale.set(r, r, 1);
        } else if (tool === "ellipse") {
          const rx = Math.abs(x - start.x);
          const ry = Math.abs(y - start.y);
          tempObjectRef.current.scale.set(rx, ry, 1);
        }
      }
    };

    // finalize polyline on double click: add full polyline to store and remove temp visuals
    const onDoubleClick = (ev) => {
      if (!polylineModeRef.current || uiStore.activeTool !== "polyline") return;

      // If there is a preview segment, remove it
      if (previewSegmentRef.current) {
        scene.remove(previewSegmentRef.current);
        previewSegmentRef.current.geometry.dispose();
        previewSegmentRef.current.material.dispose();
        previewSegmentRef.current = null;
      }

      // tempPolylinePointsRef currently holds committed vertices (no preview)
      const pts = tempPolylinePointsRef.current.slice();
      if (pts.length >= 2) {
        // add to SketchStore as a single polyline shape
        const id = Date.now().toString();
        SketchStore.addShape({
          id,
          type: "polyline",
          points: pts,
          color: "#000000",
        });
      }

      // remove temporary polyline visual
      if (tempPolylineRef.current) {
        scene.remove(tempPolylineRef.current);
        tempPolylineRef.current.geometry.dispose();
        tempPolylineRef.current.material.dispose();
        tempPolylineRef.current = null;
      }

      tempPolylinePointsRef.current = [];
      polylineModeRef.current = false;
    };

    // attach events
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("dblclick", onDoubleClick);

    // resize
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
      renderer.domElement.removeEventListener("dblclick", onDoubleClick);
      window.removeEventListener("resize", handleResize);

      // dispose created objects from store sync
      for (const obj of objectsRef.current.values()) {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      }
      objectsRef.current.clear();

      // dispose any temporary visuals
      if (tempObjectRef.current) {
        scene.remove(tempObjectRef.current);
        if (tempObjectRef.current.geometry) tempObjectRef.current.geometry.dispose();
        if (tempObjectRef.current.material) tempObjectRef.current.material.dispose();
        tempObjectRef.current = null;
      }
      if (tempPolylineRef.current) {
        scene.remove(tempPolylineRef.current);
        tempPolylineRef.current.geometry.dispose();
        tempPolylineRef.current.material.dispose();
        tempPolylineRef.current = null;
      }
      if (previewSegmentRef.current) {
        scene.remove(previewSegmentRef.current);
        previewSegmentRef.current.geometry.dispose();
        previewSegmentRef.current.material.dispose();
        previewSegmentRef.current = null;
      }

      renderer.dispose();
      if (mount && renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className={`w-full h-full bg-white overflow-hidden`} />;
});


