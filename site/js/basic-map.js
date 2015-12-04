var gpUrl = "http://elevation.arcgis.com/arcgis/rest/services/Tools/Elevation/GPServer/SummarizeElevation";

var layers = [];
var visibleLayerIndex = 0;
var gp;
var markerSymbol;
var view;

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/Basemap",
  "esri/layers/VectorTileLayer",
  "esri/tasks/Geoprocessor",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "dojo/parser", "dijit/form/Button",
  "dojo/domReady!"
], function(
    Map,
    MapView,
    Basemap,
    VectorTileLayer,
    Geoprocessor,
    SimpleMarkerSymbol,
    SimpleLineSymbol
) {

  var map = new Map();

  view = new MapView({
    container: viewDivName,
    map: map,
    center: [-111.9, 40.65],
    zoom: 10
  });
  var styles = [
    "//www.arcgis.com/sharing/rest/content/items/f96366254a564adda1dc468b447ed956/resources/styles/root.json",
    "//www.arcgis.com/sharing/rest/content/items/3b8814f6ddbd485cae67e8018992246e/resources/styles/root.json",
    "mystyle.json"
  ];
  var i = 0;
  for (; i < styles.length; i++) {
    layers.push(new VectorTileLayer({ url: styles[i] }));
    if (0 != i) {
      layers[i].visible = false;
    }
  }
  var defaultBasemap = new Basemap({
    baseLayers: layers,
    title: "Default",
    id: "default"
  });
  map.basemap = defaultBasemap;
  
  markerSymbol = new SimpleMarkerSymbol({
    color: [255, 0, 0],
    outline: new SimpleLineSymbol({
      color: [255, 255, 255],
      width: 2
    })
  });
  
  gp = new Geoprocessor(gpUrl);
  map.then(function() {
    gp.outSpatialReference = map.spatialReference;
    view.on("click", runGp);
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

function runGp(evt) {
  require([
    "esri/geometry/Point",
    "esri/Graphic",
    "esri/tasks/support/FeatureSet",
    "esri/geometry/SpatialReference"
  ], function(
    Point,
    Graphic,
    FeatureSet,
    SpatialReference
  ) {
    var point = new Point({
      longitude: evt.mapPoint.longitude,
      latitude: evt.mapPoint.latitude
    });
    var inputGraphic = new Graphic({
      geometry: point,
      symbol: markerSymbol,
      attributes: {
        oid: 1
      }
    });
    var inputGraphicContainer = [];
    inputGraphicContainer.push(inputGraphic);
    var featureSet = new FeatureSet({
      geometryType: "esriGeometryPoint",
      spatialReference: new SpatialReference({
        wkid: 4326
      }),
      fields: [
        {
          name: "oid",
          type: "esriFieldTypeOID",
          alias: "oid"
        }
      ],
      features: inputGraphicContainer
    });
    var params = {
      "InputFeatures": featureSet,
      "FeatureIDField": "oid",
      "IncludeSlopeAspect": true
    };
    gp.submitJob(params).then(displayGpResult);
  });
}

function displayGpResult(response) {
  if ("esriJobSucceeded" === response.jobStatus) {
    require([
      "dojo/request/xhr",
      "esri/identity/IdentityManager",
      "esri/geometry/Point",
      "esri/geometry/SpatialReference"
    ], function(
      xhr,
      IdentityManager,
      Point,
      SpatialReference
    ) {
      var resultUrl = gp.url + "/jobs/" + response.jobId + "/" + response.results.OutputSummary.paramUrl + "?f=json&token=" + IdentityManager.findCredential(gp.url).token;
      xhr(resultUrl, {
        handleAs: "json",
        headers: {
          "X-Requested-With": ""
        }
      }).then(function(data) {
        console.log("Rock and roll: " + data);
        var resultFeature = data.value.features[0];
        var elevation = resultFeature.attributes.MeanElevation;
        var aspect = resultFeature.attributes.MeanAspect;
        var slope = resultFeature.attributes.MeanSlope;
        console.log("elevation " + elevation + ", slope " + slope + ", aspect " + aspect);
        resultFeature.geometry.spatialReference = data.value.spatialReference;
        var pt = Point.fromJSON(resultFeature.geometry);
        view.popup.set("content", "elevation " + elevation + ", slope " + slope + ", aspect " + aspect);
        view.popup.set("visible", true);
        view.popup.set("location", pt);
      }, function(err) {
        console.log("Error: " + err);
      });
    });
  }
}
