require([
  "esri/Map",
  "esri/views/MapView",
  "dojo/domReady!"
], function(Map, MapView) {

  var map = new Map();

  var view = new MapView({
    container: viewDivName,
    map: map,
    center: [-111.9, 40.65],
    zoom: 10
  });
  require([
    "esri/Basemap",
    "esri/layers/VectorTileLayer",
    "esri/layers/ArcGISTiledLayer"
  ], function(
      Basemap,
      VectorTileLayer,
      ArcGISTiledLayer
  ) {
    var defaultBasemap = new Basemap({
      baseLayers: [
        //new VectorTileLayer({ url: "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap/VectorTileServer" })
        new VectorTileLayer({ url: "https://www.arcgis.com/sharing/rest/content/items/f96366254a564adda1dc468b447ed956/resources/styles/root.json" })
      ],
      title: "Default",
      id: "default"
    });
    map.basemap = defaultBasemap;
    
  });

});
