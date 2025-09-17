// src/stores/sketchstore.js
import { makeAutoObservable } from "mobx";

class sketchStore {
  shapes = [];
  selectedShapeId = null;

  constructor() {
    makeAutoObservable(this);
  }

  addShape(shape) {
    this.shapes.push({ ...shape, hidden: false });
  }

  selectShape(id) {
    this.selectedShapeId = id;
  }

  deleteShape(id) {
    this.shapes = this.shapes.filter((s) => s.id !== id);
    if (this.selectedShapeId === id) this.selectedShapeId = null;
  }

  updateShape(id, newProps) {
    const shape = this.shapes.find((s) => s.id === id);
    if (shape) Object.assign(shape, newProps);
  }

  toggleVisibility(id) {
    const shape = this.shapes.find((s) => s.id === id);
    if (shape) shape.hidden = !shape.hidden;
  }

  get selectedShape() {
    return this.shapes.find((s) => s.id === this.selectedShapeId) || null;
  }
}

export const SketchStore = new sketchStore();
