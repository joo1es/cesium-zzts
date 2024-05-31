import { Viewer, Rectangle, ImageryLayer, Entity, Cartesian2, Event } from "cesium";
export declare class ZZTS {
    viewer: Viewer;
    options: Options;
    capabilities: any;
    controller: AbortController;
    end: boolean;
    currentElements: any[];
    entity: Entity;
    arrowInputAction: (click: {
        position: Cartesian2;
    }) => void;
    remove: Event.RemoveCallback;
    constructor(viewer: Viewer, options: Options);
    getCapabilities(): Promise<void>;
    getElements(): Promise<void>;
    getCameraBounds(): {
        west: number;
        south: number;
        east: number;
        north: number;
    };
    getScale(): number;
    layers: ImageryLayer[];
    loadImage(key: string, element: any, retry?: number): void;
    fly(duration?: number): void;
    getRectangle(): Rectangle;
    destory(): void;
}
interface Options {
    url: string;
    layerName: string;
    customParameters: Record<string, any>;
    onLoad?: (capabilities: any) => void;
    onGetZoom?: (zoom: number) => void;
    index?: number;
    onClick?: (click: {
        mapPoint: {
            longitude: any;
            latitude: any;
        };
        options: Options;
    }) => void;
}
export {};
