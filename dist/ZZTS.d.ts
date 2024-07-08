import { Viewer, Rectangle, Entity, Cartesian2, Event, CustomDataSource } from "cesium";
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
    removeEvent: Event.RemoveCallback;
    delay: number;
    scale: number;
    dataSource: CustomDataSource;
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
    layers: Entity[];
    loadImage(key: string, element: any, retry?: number): void;
    fly(duration?: number): void;
    getRectangle(): Rectangle;
    destory(): void;
    setIndex(index: number): void;
    updateSort(layers: ZZTS[]): void;
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
export declare function updateSort(zzts: ZZTS[]): void;
export {};
