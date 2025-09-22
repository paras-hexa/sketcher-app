// src/Components/toolbar/Toolbar.jsx
import React, { useRef } from "react";
import { observer } from "mobx-react-lite";
import { uiStore } from "../../stores/uistore";
import { SketchStore } from "../../stores/sketchstore";
import {
  PenLine,
  Circle,
  CircleDashed,
  Route,
  Save,
  Upload
} from "lucide-react"; // icon library

export const Toolbar = observer(() => {
  const fileInputRef = useRef(null);

  const tools = [
    { key: "line", label: "Line", icon: <PenLine size={20} /> },
    { key: "circle", label: "Circle", icon: <Circle size={20} /> },
    { key: "ellipse", label: "Ellipse", icon: <CircleDashed size={20} /> },
    { key: "polyline", label: "Polyline", icon: <Route size={20} /> }
  ];

  // Save JSON
  const handleSave = () => {
    const json = JSON.stringify(SketchStore.shapes, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "drawing.json";
    link.click();
  };

  // Upload JSON
  const handleUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const shapes = JSON.parse(e.target.result);
        if (Array.isArray(shapes)) {
          shapes.forEach((shape) => SketchStore.addShape(shape));
        }
      } catch (err) {
        console.error("Invalid JSON file", err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center space-x-3 my-3">
      {/* Drawing tools group */}
      <div className="flex space-x-2 bg-gray-100 px-2 py-1 rounded-lg">
        {tools.map((tool) => (
          <button
            key={tool.key}
            className={`flex flex-col items-center px-3 py-2 rounded-md ${
              uiStore.activeTool === tool.key ? "bg-gray-200" : ""
            }`}
            onClick={() => uiStore.setActiveTool(tool.key)}
          >
            
            {tool.icon}
            <span className="text-xs">{tool.label}</span>
          </button>
        ))}
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className="flex flex-col items-center px-3 py-2 bg-gray-100 rounded-lg"
      >
        <Save size={20} />
        <span className="text-xs">Save</span>
      </button>

      {/* Upload */}
      <button
        onClick={() => fileInputRef.current.click()}
        className="flex flex-col items-center px-3 py-2 bg-gray-100 rounded-lg"
      >
        <Upload size={20} />
        <span className="text-xs">Upload</span>
      </button>
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
});
