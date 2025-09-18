import { makeAutoObservable } from "mobx";

class UiStore{
    activeTool = null;
    searchQuery = '';
    
    constructor(){
        makeAutoObservable(this);
    }
    setActiveTool(tool){
        if (this.activeTool === tool) {
            this.activeTool = null; // Deselect if already selected
        } else {
            this.activeTool = tool; // Select if not selected
        }
    }

    setSearchquery(query){
        this.searchQuery = query;
    }

    get  getactivetool(){
        return this.activeTool
    }

     get getSearchquery(){
        return this.searchQuery
    }
}

export const uiStore = new UiStore();

