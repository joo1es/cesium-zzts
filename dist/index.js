import { Math, Cartesian3, Rectangle, SingleTileImageryProvider } from 'cesium';

class ZZTS {
    constructor(viewer, options) {
        this.end = false;
        this.delay = 1000;
        this.layers = [];
        this.viewer = viewer;
        this.options = options;
        this.getCapabilities();
        this.getElements();
        this.removeEvent = this.viewer.camera.moveEnd.addEventListener(() => this.getElements());
    }
    getCapabilities() {
        const url = new URL(this.options.url);
        url.searchParams.append('REQUEST', 'GetCapabilities');
        url.searchParams.append('SERVICE', 'ZZTS');
        url.searchParams.append('LAYER', this.options.layerName);
        for (const key in this.options.customParameters) {
            url.searchParams.append(key, this.options.customParameters[key]);
        }
        return fetch(url)
            .then(res => res.json())
            .then(res => {
            var _a, _b;
            this.capabilities = res;
            (_b = (_a = this.options).onLoad) === null || _b === void 0 ? void 0 : _b.call(_a, res);
        });
    }
    getElements() {
        if (this.end)
            return;
        if (this.controller)
            this.controller.abort();
        this.controller = new AbortController();
        const signal = this.controller.signal;
        const url = new URL(this.options.url + '/elements');
        url.searchParams.append('SRS', 'EPSG:4326');
        url.searchParams.append('SERVICE', 'ZZTS');
        url.searchParams.append('LAYER', this.options.layerName);
        const bounds = this.getCameraBounds();
        if (bounds) {
            url.searchParams.append('BBOX', `${bounds.west},${bounds.north},${bounds.east},${bounds.south}`);
        }
        const height = this.viewer.container.clientHeight;
        const width = this.viewer.container.clientWidth;
        url.searchParams.append('SCALE', String(this.getScale()));
        url.searchParams.append('HEIGHT', String(height));
        url.searchParams.append('WIDTH', String(width));
        for (const key in this.options.customParameters) {
            url.searchParams.append(key, this.options.customParameters[key]);
        }
        return fetch(url, {
            signal,
        })
            .then(res => res.json())
            .then(res => {
            var _a, _b;
            const elements = res.elements || [];
            if (!elements)
                return;
            this.currentElements = elements;
            (_b = (_a = this.options).onGetZoom) === null || _b === void 0 ? void 0 : _b.call(_a, res.zoom);
            for (const element of elements) {
                if (!element.id)
                    return;
                this.loadImage(element.id, element);
            }
            for (const id in this.layers) {
                const search = elements.find((element) => element.id === id);
                if (!search) {
                    const layer = this.layers[id];
                    delete this.layers[id];
                    setTimeout(() => {
                        this.viewer.scene.imageryLayers.remove(layer);
                        layer.destroy();
                    }, this.delay);
                }
            }
        })
            .catch(err => {
        });
    }
    getCameraBounds() {
        const rectangle = this.viewer.camera.computeViewRectangle();
        if (rectangle) {
            const west = Math.toDegrees(rectangle.west);
            const south = Math.toDegrees(rectangle.south);
            const east = Math.toDegrees(rectangle.east);
            const north = Math.toDegrees(rectangle.north);
            return {
                west,
                south,
                east,
                north
            };
        }
    }
    getScale() {
        const cameraPosition = this.viewer.scene.camera.positionWC;
        const ellipsoidPosition = this.viewer.scene.globe.ellipsoid.scaleToGeodeticSurface(cameraPosition);
        const distance = Cartesian3.magnitude(Cartesian3.subtract(cameraPosition, ellipsoidPosition, new Cartesian3()));
        return distance * 10;
    }
    loadImage(key, element, retry = 0) {
        if (retry === 3)
            return;
        if (!this.currentElements.find((e) => e.id === element.id))
            return;
        const img = new Image();
        img.src = element.url;
        img.onload = () => {
            if (this.layers[key])
                return;
            if (this.end)
                return;
            if (!this.currentElements.find((e) => e.id === element.id))
                return;
            const rectangle = Rectangle.fromDegrees(element.extent.xmin, element.extent.ymin, element.extent.xmax, element.extent.ymax);
            const imageLayer = this.viewer.scene.imageryLayers.addImageryProvider(new SingleTileImageryProvider({
                url: element.url,
                rectangle: rectangle,
                tileHeight: img.height,
                tileWidth: img.width
            }), this.options.index);
            if (!this.layers[key])
                this.layers[key] = imageLayer;
        };
        img.onerror = () => {
            setTimeout(() => this.loadImage(key, element, retry + 1), 1000);
        };
    }
    fly(duration = 3) {
        if (!this.capabilities.extent)
            return;
        this.viewer.camera.flyTo({
            destination: this.getRectangle(),
            duration
        });
    }
    getRectangle() {
        if (!this.capabilities.extent)
            return;
        const extent = this.capabilities.extent;
        const rectangle = Rectangle.fromDegrees(extent.xmin, extent.ymin, extent.xmax, extent.ymax);
        return rectangle;
    }
    destory() {
        this.end = true;
        this.layers.forEach(layer => {
            this.viewer.scene.imageryLayers.remove(layer);
            layer.destroy();
        });
        this.layers = [];
        this.removeEvent();
    }
}

export { ZZTS as default };
