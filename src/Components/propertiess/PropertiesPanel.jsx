// src/Components/properties/PropertiesPanel.jsx
import React from "react";
import { observer } from "mobx-react-lite";
import { SketchStore } from "../../stores/sketchstore";

export const PropertiesPanel = observer(() => {
  const shape = SketchStore.selectedShape;

  if (!shape) return <div className="p-4 text-gray-500">Select a shape</div>;

  const handleChange = (field, value) => {
    SketchStore.updateShape(shape.id, { [field]: value });
  };

  return (
    <div className="p-4 border-l w-64 bg-white flex flex-col gap-4">
      <h3 className="font-semibold text-lg border-b pb-1">
        {shape.type} Properties
      </h3>

      {/* Position Section */}
      {(shape.type === "line" ||
        shape.type === "circle" ||
        shape.type === "ellipse") && (
        <div>
          <h4 className="font-medium mb-1">Position</h4>
          {shape.type === "line" ? (
            <div className="space-y-2">
              <div>
                <label className="text-sm">Start (x,y,z)</label>
                <div className="flex gap-1">
                  <input type="number" value={shape.x1}
                    onChange={(e) => handleChange("x1", parseFloat(e.target.value))}
                    className="w-16 border p-1"
                  />
                  <input type="number" value={shape.y1}
                    onChange={(e) => handleChange("y1", parseFloat(e.target.value))}
                    className="w-16 border p-1"
                  />
                  <input type="number" value={shape.z1 || 0}
                    onChange={(e) => handleChange("z1", parseFloat(e.target.value))}
                    className="w-16 border p-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm">End (x,y,z)</label>
                <div className="flex gap-1">
                  <input type="number" value={shape.x2}
                    onChange={(e) => handleChange("x2", parseFloat(e.target.value))}
                    className="w-16 border p-1"
                  />
                  <input type="number" value={shape.y2}
                    onChange={(e) => handleChange("y2", parseFloat(e.target.value))}
                    className="w-16 border p-1"
                  />
                  <input type="number" value={shape.z2 || 0}
                    onChange={(e) => handleChange("z2", parseFloat(e.target.value))}
                    className="w-16 border p-1"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-1">
              <input type="number" value={shape.cx}
                onChange={(e) => handleChange("cx", parseFloat(e.target.value))}
                className="w-16 border p-1"
              />
              <input type="number" value={shape.cy}
                onChange={(e) => handleChange("cy", parseFloat(e.target.value))}
                className="w-16 border p-1"
              />
              {shape.cz !== undefined && (
                <input type="number" value={shape.cz}
                  onChange={(e) => handleChange("cz", parseFloat(e.target.value))}
                  className="w-16 border p-1"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Size / Radius */}
      {shape.type === "circle" && (
        <div>
          <h4 className="font-medium mb-1">Radius</h4>
          <input
            type="number"
            value={shape.r}
            onChange={(e) => handleChange("r", parseFloat(e.target.value))}
            className="w-full border p-1"
          />
        </div>
      )}
      {shape.type === "ellipse" && (
        <div>
          <h4 className="font-medium mb-1">Radii</h4>
          <div className="flex gap-2">
            <input type="number" value={shape.rx}
              onChange={(e) => handleChange("rx", parseFloat(e.target.value))}
              className="w-20 border p-1"
            />
            <input type="number" value={shape.ry}
              onChange={(e) => handleChange("ry", parseFloat(e.target.value))}
              className="w-20 border p-1"
            />
          </div>
        </div>
      )}

      {/* Polyline Points */}
      {shape.type === "polyline" && (
        <div>
          <h4 className="font-medium mb-1">Points</h4>
          <div className="space-y-1">
            {shape.points.map((pt, idx) => (
              <div key={idx} className="flex gap-1">
                <input
                  type="number"
                  value={pt.x}
                  onChange={(e) => {
                    const newPoints = [...shape.points];
                    newPoints[idx].x = parseFloat(e.target.value);
                    handleChange("points", newPoints);
                  }}
                  className="w-20 border p-1"
                />
                <input
                  type="number"
                  value={pt.y}
                  onChange={(e) => {
                    const newPoints = [...shape.points];
                    newPoints[idx].y = parseFloat(e.target.value);
                    handleChange("points", newPoints);
                  }}
                  className="w-20 border p-1"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Color */}
      <div>
        <h4 className="font-medium mb-1">Color</h4>
        <input
          type="color"
          value={shape.color || "#ff0000"}
          onChange={(e) => handleChange("color", e.target.value)}
          className="w-16 h-8 border"
        />
      </div>

      {/* Visibility + Delete */}
      <div className="flex justify-between mt-4">
        <button
          className="px-2 py-1 border rounded"
          onClick={() => SketchStore.toggleVisibility(shape.id)}
        >
          {shape.hidden ? "Show" : "Hide"}
        </button>
        <button
          className="px-2 py-1 border rounded text-red-600"
          onClick={() => SketchStore.deleteShape(shape.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
});
