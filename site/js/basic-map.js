var gpUrl = "http://elevation.arcgis.com/arcgis/rest/services/Tools/Elevation/GPServer/SummarizeElevation";

var layers = [];
var visibleLayerIndex = 0;
var gp;
var loadingSymbol;
var markerSymbol;
var view;
var gpGraphicsLayer;

require([
  "esri/Map",
  "esri/views/MapView",
  "esri/Basemap",
  "esri/layers/VectorTileLayer",
  "esri/tasks/Geoprocessor",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/layers/GraphicsLayer",
  "esri/widgets/Locate",
  "dojo/parser", "dijit/form/Button",
  "dojo/domReady!"
], function(
    Map,
    MapView,
    Basemap,
    VectorTileLayer,
    Geoprocessor,
    PictureMarkerSymbol,
    SimpleMarkerSymbol,
    SimpleLineSymbol,
    GraphicsLayer,
    Locate
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
  
  loadingSymbol = new PictureMarkerSymbol({
    url: "img/spinner_white.gif"
  });
  markerSymbol = new SimpleMarkerSymbol({
    color: [0, 255, 0],
    outline: new SimpleLineSymbol({
      color: [255, 255, 255],
      width: 2
    })
  });
  
  gp = new Geoprocessor(gpUrl);
  map.then(function() {
    gpGraphicsLayer = new GraphicsLayer();
    map.add(gpGraphicsLayer);
    gp.outSpatialReference = map.spatialReference;
    view.on("click", runGp);
  });
  
  var locateGraphicsLayer = new GraphicsLayer();
  map.add(locateGraphicsLayer);
  new Locate({
    view: view,
    graphicsLayer: locateGraphicsLayer
  }, "locateDiv").startup();
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
    "esri/geometry/SpatialReference",
    "esri/identity/IdentityManager"
  ], function(
    Point,
    Graphic,
    FeatureSet,
    SpatialReference,
    IdentityManager
  ) {
    var point = new Point({
      longitude: evt.mapPoint.longitude,
      latitude: evt.mapPoint.latitude
    });
    var inputGraphic = new Graphic({
      geometry: point,
      symbol: loadingSymbol,
      attributes: {
        oid: 1
      }
    });
    gpGraphicsLayer.clear();
    gpGraphicsLayer.add(inputGraphic);
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
    if (!IdentityManager.findCredential(gpUrl)) {
      var idManagerJson = getCookie("idManagerJson");
      if (idManagerJson && 0 < idManagerJson.length) {
        IdentityManager.initialize(JSON.parse(idManagerJson));
      }
    }
    gp.submitJob(params).then(handleGpResult);
  });
}

function handleGpResult(response) {
  require([
    "esri/identity/IdentityManager"
  ], function(
    IdentityManager
  ) {
    //1. Store the IdentityManager as a cookie
    var idManagerJson = JSON.stringify(IdentityManager.toJSON());
    setCookie("idManagerJson", idManagerJson, 30);
  });  
  
  //2. Display the result
  displayGpResult(response);
}

function displayGpResult(response) {
  gpGraphicsLayer.clear();
  if ("esriJobSucceeded" === response.jobStatus) {
    require([
      "dojo/request/xhr",
      "esri/identity/IdentityManager",
      "esri/geometry/Point",
      "esri/geometry/SpatialReference",
      "esri/Graphic"
    ], function(
      xhr,
      IdentityManager,
      Point,
      SpatialReference,
      Graphic
    ) {
      var resultUrl = gp.url + "/jobs/" + response.jobId + "/" + response.results.OutputSummary.paramUrl + "?f=json&token=" + IdentityManager.findCredential(gp.url).token;
      xhr(resultUrl, {
        handleAs: "json",
        headers: {
          "X-Requested-With": ""
        }
      }).then(function(data) {
        var resultFeature = data.value.features[0];
        var elevation = resultFeature.attributes.MeanElevation;
        var aspect = resultFeature.attributes.MeanAspect;
        var slope = resultFeature.attributes.MeanSlope;
        resultFeature.geometry.spatialReference = data.value.spatialReference;
        var pt = Point.fromJSON(resultFeature.geometry);
        view.popup.title = "Elevation: " + Math.round(elevation * 3.28084) + " ft (" + Math.round(elevation) + " m)";
        view.popup.set("content", "<table border='0'><tr><td>Slope</td><td>" + Math.round(slope * 10) / 10.0 + "°</td></tr><tr><td>Aspect</td><td>" + Math.round(aspect) + "° (" + getHeadingString(aspect) + " &#" + getHeadingArrowAsciiCode(aspect) + ";)</td></tr></table>");
        view.popup.set("visible", true);
        view.popup.set("location", pt);
        var graphic = new Graphic({
          geometry: pt,
          symbol: markerSymbol
        });
        gpGraphicsLayer.add(graphic);
      }, function(err) {
        console.log("Error: " + err);
      });
    });
  }
}

/**
 * Normalizes a number of degrees to the range [0, 360) and returns the result.
 */
function fixDegrees(degrees) {
  while (degrees >= 360) {
    degrees -= 360;
  }
  while (degrees < 0) {
    degrees += 360;
  }
  return degrees;
}

/**
 * Returns a text heading like N or SW for a number of degrees.
 */
function getHeadingString(degrees) {
  degrees = fixDegrees(degrees);
  var northingString = "";
  var eastingString = "";
  if (degrees > 292.5 || degrees <= 67.5) {
    northingString = "N";
  } else if (degrees > 112.5 && degrees <= 247.5) {
    northingString = "S";
  }
  if (degrees > 22.5 && degrees <= 157.5) {
    eastingString = "E";
  } else if (degrees > 202.5 && degrees <= 337.5) {
    eastingString = "W";
  }
  return northingString + eastingString;
}

function getHeadingArrowAsciiCode(degrees) {
  var headingString = getHeadingString(degrees);
  switch (headingString) {
    case "N":
      return 8593;
    case "NE":
      return 8599;
    case "E":
      return 8594;
    case "SE":
      return 8600;
    case "S":
      return 8595;
    case "SW":
      return 8601;
    case "W":
      return 8592;
    case "NW":
      return 8598;
  }
}

/**
 * Cookie methods were lifted from http://www.w3schools.com/js/js_cookies.asp .
 */
function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+d.toUTCString();
  document.cookie = cname + "=" + cvalue + "; " + expires;
}

function getCookie(cname) {
  var name = cname + "=";
  var ca = document.cookie.split(';');
  for(var i=0; i<ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1);
    if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
  }
  return "";
}
