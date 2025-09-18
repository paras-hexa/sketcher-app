// src/Components/toolbar/Toolbar.jsx
import React from "react";
import { observer } from "mobx-react-lite";
import { uiStore } from "../../stores/uistore";
import { useId } from "react";
export const Toolbar = observer(() => {
    const tools = ["line", "circle", "ellipse", "polyline"];
    const id = useId()
    
    return (
        <>
            <div className="toolbar border py-2 px-1 my-2 rounded-md space-x-2 bg-gray-300">
                {tools.map((tool) => (
                    <button
                        key={tool}
                        className={uiStore.activeTool === tool ? "active bg-gray-100 rounded-md" : ""}
                        onClick={() => uiStore.setActiveTool(tool)}
                    >
                        {tool.charAt(0).toUpperCase() + tool.slice(1)}
                    </button>
                ))}
            </div>
        </>
    );
});

