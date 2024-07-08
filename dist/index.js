import { CustomDataSource, Math as Math$1, Cartesian3, Rectangle, PolygonHierarchy, ImageMaterialProperty } from 'cesium';

class ZZTS {
    constructor(viewer, options) {
        this.end = false;
        this.delay = 1000;
        this.scale = 5;
        this.layers = [];
        this.viewer = viewer;
        this.options = options;
        this.getCapabilities();
        this.removeEvent = this.viewer.camera.moveEnd.addEventListener(() => this.getElements());
        this.dataSource = new CustomDataSource(String(Math.random()));
        viewer.dataSources.add(this.dataSource);
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
            this.getElements();
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
                        this.dataSource.entities.remove(layer);
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
            const west = Math$1.toDegrees(rectangle.west);
            const south = Math$1.toDegrees(rectangle.south);
            const east = Math$1.toDegrees(rectangle.east);
            const north = Math$1.toDegrees(rectangle.north);
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
        return distance * this.scale;
    }
    loadImage(key, element, retry = 0) {
        if (retry === 3)
            return;
        const img = new Image();
        img.src = element.url;
        img.onload = () => {
            if (this.layers[key])
                return;
            if (this.end)
                return;
            const rectangle = Rectangle.fromDegrees(element.extent.xmin, element.extent.ymin, element.extent.xmax, element.extent.ymax);
            const entity = this.dataSource.entities.add({
                id: key,
                name: key,
                polygon: {
                    hierarchy: rectangle2Hierarchy(rectangle),
                    zIndex: this.options.index,
                    material: new ImageMaterialProperty({
                        image: element.url
                    })
                },
            });
            if (!this.layers[key])
                this.layers[key] = entity;
        };
        img.onerror = () => {
            setTimeout(() => this.loadImage(key, element, retry + 1), 3000);
        };
    }
    fly(duration = 3) {
        var _a;
        if (!((_a = this.capabilities) === null || _a === void 0 ? void 0 : _a.extent))
            return;
        this.viewer.camera.flyTo({
            destination: this.getRectangle(),
            duration
        });
    }
    getRectangle() {
        var _a;
        if (!((_a = this.capabilities) === null || _a === void 0 ? void 0 : _a.extent))
            return;
        const extent = this.capabilities.extent;
        const rectangle = Rectangle.fromDegrees(extent.xmin, extent.ymin, extent.xmax, extent.ymax);
        return rectangle;
    }
    destory() {
        this.end = true;
        this.layers.forEach(layer => {
            this.dataSource.entities.remove(layer);
        });
        this.layers = [];
        this.removeEvent();
        this.viewer.dataSources.remove(this.dataSource);
    }
    setIndex(index) {
        this.options.index = index;
        this.getElements();
    }
    updateSort(layers) {
        updateSort(layers);
    }
}
function rectangle2Hierarchy(rectangle) {
    var nw = Rectangle.northwest(rectangle);
    var ne = Rectangle.northeast(rectangle);
    var se = Rectangle.southeast(rectangle);
    var sw = Rectangle.southwest(rectangle);
    return new PolygonHierarchy([
        Cartesian3.fromRadians(nw.longitude, nw.latitude),
        Cartesian3.fromRadians(ne.longitude, ne.latitude),
        Cartesian3.fromRadians(se.longitude, se.latitude),
        Cartesian3.fromRadians(sw.longitude, sw.latitude)
    ]);
}
function updateSort(zzts) {
    if (zzts.length === 0)
        return;
    const zztsMap = [...zzts];
    zztsMap.forEach(t => t.viewer.dataSources.remove(t.dataSource));
    zztsMap.sort((a, b) => {
        return a.options.index - b.options.index;
    });
    zztsMap.forEach(t => t.viewer.dataSources.add(t.dataSource));
}

export { ZZTS as default };
