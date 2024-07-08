import {
    Viewer,
    Rectangle,
    Math as CesiumMath,
    Cartesian3,
    Entity,
    Cartesian2,
    Event,
    ImageMaterialProperty,
    PolygonHierarchy,
    CustomDataSource
} from "cesium"

export class ZZTS {
    viewer: Viewer
    options: Options
    capabilities: any
    controller: AbortController
    end = false
    currentElements: any[]
    entity: Entity
    arrowInputAction: (click: { position: Cartesian2 }) => void
    removeEvent: Event.RemoveCallback
    delay = 1000
    scale = 5
    dataSource: CustomDataSource
    constructor(viewer: Viewer, options: Options) {
        this.viewer = viewer
        this.options = options
        this.getCapabilities()
        this.removeEvent = this.viewer.camera.moveEnd.addEventListener(() => this.getElements())
        this.dataSource = new CustomDataSource(String(Math.random()))
        viewer.dataSources.add(this.dataSource)
    }
    getCapabilities () {
        const url = new URL(this.options.url)
        url.searchParams.append('REQUEST', 'GetCapabilities')
        url.searchParams.append('SERVICE', 'ZZTS')
        url.searchParams.append('LAYER', this.options.layerName)
        for (const key in this.options.customParameters) {
            url.searchParams.append(key, this.options.customParameters[key])
        }

        return fetch(url)
            .then(res => res.json())
            .then(res => {
                this.capabilities = res
                this.options.onLoad?.(res)
                this.getElements()
            })
    }
    getElements () {
        if (this.end) return
        if (this.controller) this.controller.abort()
        this.controller = new AbortController()
        const signal = this.controller.signal
        const url = new URL(this.options.url + '/elements')
        url.searchParams.append('SRS', 'EPSG:4326')
        url.searchParams.append('SERVICE', 'ZZTS')
        url.searchParams.append('LAYER', this.options.layerName)
        const bounds = this.getCameraBounds()
        if (bounds) {
            url.searchParams.append('BBOX', `${bounds.west},${bounds.north},${bounds.east},${bounds.south}`)
        }
        const height = this.viewer.container.clientHeight
        const width = this.viewer.container.clientWidth
        url.searchParams.append('SCALE', String(this.getScale()))
        url.searchParams.append('HEIGHT', String(height))
        url.searchParams.append('WIDTH', String(width))
        for (const key in this.options.customParameters) {
            url.searchParams.append(key, this.options.customParameters[key])
        }
        return fetch(url, {
            signal,
        })
            .then(res => res.json())
            .then(res => {
                const elements = res.elements || []
                if (!elements) return
                this.currentElements = elements
                this.options.onGetZoom?.(res.zoom)
                for (const element of elements) {
                    if (!element.id) return
                    this.loadImage(element.id, element)
                }
                for (const id in this.layers) {
                    const search = elements.find((element: any) => element.id === id)
                    if (!search) {
                        const layer = this.layers[id]
                        delete this.layers[id]
                        setTimeout(() => {
                            this.dataSource.entities.remove(layer)
                        }, this.delay)
                    }
                }

            })
            .catch(err => {
                void err
            })
    }
    getCameraBounds() {
      const rectangle = this.viewer.camera.computeViewRectangle();

      if (rectangle) {
        const west = CesiumMath.toDegrees(rectangle.west)
        const south = CesiumMath.toDegrees(rectangle.south)
        const east = CesiumMath.toDegrees(rectangle.east)
        const north = CesiumMath.toDegrees(rectangle.north)

        return {
          west,
          south,
          east,
          north
        }
      }
    }
    getScale() {
        const cameraPosition = this.viewer.scene.camera.positionWC
        const ellipsoidPosition = this.viewer.scene.globe.ellipsoid.scaleToGeodeticSurface(cameraPosition)
        const distance = Cartesian3.magnitude(Cartesian3.subtract(cameraPosition, ellipsoidPosition, new Cartesian3()))
        return distance * this.scale
    }
    layers: Entity[] = []
    /** 加载图片 */
    loadImage (key: string, element: any, retry = 0) {
        if (retry === 3) return
        // if (!this.currentElements.find((e: any) => e.id === element.id)) return
        const img = new Image()
        img.src = element.url
        img.onload = () => {
            if (this.layers[key]) return
            if (this.end) return
            //   if (!this.currentElements.find((e: any) => e.id === element.id)) return
            const rectangle = Rectangle.fromDegrees(element.extent.xmin, element.extent.ymin, element.extent.xmax, element.extent.ymax); // 替换为你的图片覆盖区域（西、南、东、北）
            const entity = this.dataSource.entities.add({
                id: key,
                name: key,
                polygon: {
                    hierarchy: rectangle2Hierarchy(rectangle),
                    zIndex: this.options.index,
                    material: new ImageMaterialProperty({
                        image: element.url
                    }) // image的值为图片地址。ImageMaterialProperty默认图片不重复，不需要额外设置
                },
            })
            

            if (!this.layers[key]) this.layers[key] = entity
        }
        /** 请求失败重试 */
        img.onerror = () => {
          setTimeout(() => this.loadImage(key, element, retry + 1), 3000)
        }
      }
    fly(duration = 3) {
        if (!this.capabilities?.extent) return

        // 使用flyTo方法
        this.viewer.camera.flyTo({
            destination: this.getRectangle(),
            duration // 3秒飞行时间
        })
    }
    getRectangle() {
        if (!this.capabilities?.extent) return
        const extent = this.capabilities.extent
        const rectangle = Rectangle.fromDegrees(
            extent.xmin,
            extent.ymin,
            extent.xmax,
            extent.ymax
        )
        return rectangle
    }
    destory() {
        this.end = true
        this.layers.forEach(layer => {
            this.dataSource.entities.remove(layer)
        })
        this.layers = []
        this.removeEvent()
        this.viewer.dataSources.remove(this.dataSource)
    }
    setIndex(index: number) {
        this.options.index = index
        this.getElements()
    }
    updateSort(layers: ZZTS[]) {
        updateSort(layers)
    }
}

interface Options {
    url: string,
    layerName: string,
    customParameters: Record<string, any>,
    onLoad?: (capabilities: any) => void,
    onGetZoom?: (zoom: number) => void,
    index?: number
    onClick?: (click: { mapPoint: { longitude, latitude }, options: Options }) => void
}

function rectangle2Hierarchy (rectangle: Rectangle) {
    // 获取Rectangle的四个角点
    var nw = Rectangle.northwest(rectangle);
    var ne = Rectangle.northeast(rectangle);
    var se = Rectangle.southeast(rectangle);
    var sw = Rectangle.southwest(rectangle);

    // 创建一个PolygonHierarchy
    return new PolygonHierarchy([
        Cartesian3.fromRadians(nw.longitude, nw.latitude),
        Cartesian3.fromRadians(ne.longitude, ne.latitude),
        Cartesian3.fromRadians(se.longitude, se.latitude),
        Cartesian3.fromRadians(sw.longitude, sw.latitude)
    ]);
}

export function updateSort(zzts: ZZTS[]) {
    if (zzts.length === 0) return
    const zztsMap = [...zzts]
    zztsMap.forEach(t => t.viewer.dataSources.remove(t.dataSource))
    zztsMap.sort((a, b) => {
        return a.options.index - b.options.index
    })
    zztsMap.forEach(t => t.viewer.dataSources.add(t.dataSource))
}