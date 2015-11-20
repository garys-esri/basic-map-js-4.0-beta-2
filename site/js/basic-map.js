var layers = [];
var visibleLayerIndex = 0;

require([
  "esri/Map",
  "esri/views/MapView",
  "dojo/parser", "dijit/form/Button",
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
    "esri/layers/VectorTileLayer"
  ], function(
      Basemap,
      VectorTileLayer
  ) {
    var primaryStyle = "https://www.arcgis.com/sharing/rest/content/items/f96366254a564adda1dc468b447ed956/resources/styles/root.json";
    var secondaryStyle = "http://www.arcgis.com/sharing/rest/content/items/3b8814f6ddbd485cae67e8018992246e/resources/styles/root.json";
    var primaryLayer = new VectorTileLayer({ url: primaryStyle });
    layers.push(primaryLayer);
    var secondaryLayer = new VectorTileLayer({ url: secondaryStyle, visible: false });
    layers.push(secondaryLayer);
    var defaultBasemap = new Basemap({
      baseLayers: [ primaryLayer, secondaryLayer ],
      title: "Default",
      id: "default"
    });
    map.basemap = defaultBasemap;
  });

});

function basemapButtonClicked(val) {
  visibleLayerIndex++;
  if (layers.length <= visibleLayerIndex) {
    visibleLayerIndex = 0;
  }
  var i = 0;
  for (; i < layers.length; i++) {
    layers[i].visible = (i == visibleLayerIndex);
  }
}
