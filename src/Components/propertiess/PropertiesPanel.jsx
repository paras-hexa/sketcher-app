// src/Components/properties/PropertiesPanel.jsx
import React from "react";
import { observer } from "mobx-react-lite";
import { SketchStore } from "../../stores/sketchstore";

export const PropertiesPanel = observer(() => {
  const shape = SketchStore.selectedShape;

  if (!shape) return <div className="properties-panel">Select a shape</div>;

  const handleChange = (field, value) => {
    SketchStore.updateShape(shape.id, { [field]: value });
  };

  return (
    <div className="properties-panel">
      <h3>Properties: {shape.type}</h3>

      {/* Color */}
      <label>Color:</label>
      <input
        type="color"
        value={shape.color || "#ff0000"}
        onChange={(e) => handleChange("color", e.target.value)}
      />

      {/* Dynamic fields per shape type */}
      {shape.type === "line" && (
        <>
          <h4>Start</h4>
          <input
            type="number"
            value={shape.x1}
            onChange={(e) => handleChange("x1", parseFloat(e.target.value))}
          />
          <input
            type="number"
            value={shape.y1}
            onChange={(e) => handleChange("y1", parseFloat(e.target.value))}
          />
          <input
            type="number"
            value={shape.z1 || 0}
            onChange={(e) => handleChange("z1", parseFloat(e.target.value))}
          />
          <h4>End</h4>
          <input
            type="number"
            value={shape.x2}
            onChange={(e) => handleChange("x2", parseFloat(e.target.value))}
          />
          <input
            type="number"
            value={shape.y2}
            onChange={(e) => handleChange("y2", parseFloat(e.target.value))}
          />
          <input
            type="number"
            value={shape.z2 || 0}
            onChange={(e) => handleChange("z2", parseFloat(e.target.value))}
          />
        </>
      )}

      {shape.type === "circle" && (
        <>
          <h4>Center</h4>
          <input
            type="number"
            value={shape.cx}
            onChange={(e) => handleChange("cx", parseFloat(e.target.value))}
          />
          <input
            type="number"
            value={shape.cy}
            onChange={(e) => handleChange("cy", parseFloat(e.target.value))}
          />
          <input
            type="number"
            value={shape.cz || 0}
            onChange={(e) => handleChange("cz", parseFloat(e.target.value))}
          />
          <h4>Radius</h4>
          <input
            type="number"
            value={shape.r}
            onChange={(e) => handleChange("r", parseFloat(e.target.value))}
          />
        </>
      )}

      {shape.type === "ellipse" && (
        <>
          <h4>Center</h4>
          <input
            type="number"
            value={shape.cx}
            onChange={(e) => handleChange("cx", parseFloat(e.target.value))}
          />
          <input
            type="number"
            value={shape.cy}
            onChange={(e) => handleChange("cy", parseFloat(e.target.value))}
          />
          <h4>Radii</h4>
          <input
            type="number"
            value={shape.rx}
            onChange={(e) => handleChange("rx", parseFloat(e.target.value))}
          />
          <input
            type="number"
            value={shape.ry}
            onChange={(e) => handleChange("ry", parseFloat(e.target.value))}
          />
        </>
      )}

      {shape.type === "polyline" && (
        <>
          <h4>Points</h4>
          {shape.points.map((pt, idx) => (
            <div key={idx}>
              <input
                type="number"
                value={pt.x}
                onChange={(e) => {
                  const newPoints = [...shape.points];
                  newPoints[idx].x = parseFloat(e.target.value);
                  handleChange("points", newPoints);
                }}
              />
              <input
                type="number"
                value={pt.y}
                onChange={(e) => {
                  const newPoints = [...shape.points];
                  newPoints[idx].y = parseFloat(e.target.value);
                  handleChange("points", newPoints);
                }}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
});


