// src/Components/sidebar/ShapeList.jsx
import React from "react";
import { observer } from "mobx-react-lite";
import { SketchStore } from "../../stores/sketchstore";

export const ShapeList = observer(() => {
  return (
    <div className="shape-list">
      <h3>Shapes</h3>
      {SketchStore.shapes.map((shape) => (
        <div
          key={shape.id}
          className={`shape-item ${
            SketchStore.selectedShapeId === shape.id ? "selected" : ""
          }`}
          onClick={() => SketchStore.selectShape(shape.id)}
        >
          <span>{shape.type} {shape.id}</span>
          <button onClick={(e) => {e.stopPropagation(); SketchStore.toggleVisibility(shape.id);}}>
            {shape.hidden ? "👁️‍🗨️" : "👁️"}
          </button>
          <button onClick={(e) => {e.stopPropagation(); SketchStore.deleteShape(shape.id);}}>
            🗑️
          </button>
        </div>
      ))}
    </div>
  );
});

