import 'ol/ol.css';

import nmea from 'node-nmea';
import Feature from 'ol/Feature';
import Geolocation from 'ol/Geolocation';
import Map from 'ol/Map';
import { unByKey } from 'ol/Observable';
import View from 'ol/View';
import { easeOut } from 'ol/easing';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { getVectorContext } from 'ol/render';

const status = document.querySelector('#status');
const mapLink = document.querySelector('#map-link');

var tileLayer = new TileLayer({
  source: new OSM({
    wrapX: false
  })
});

var view = new View({
  center: [0, 6000000],
  zoom: 4
});

var map = new Map({
  layers: [tileLayer],
  target: 'map',
  view: new View({
    center: [0, 0],
    zoom: 1,
    multiWorld: true
  })
});

var source = new VectorSource({
  wrapX: false
});

var vector = new VectorLayer({
  source: source
});

map.addLayer(vector);

var geolocation = new Geolocation({
  trackingOptions: {
    enableHighAccuracy: true
  },
  projection: view.getProjection()
});

function el(id) {
  return document.getElementById(id);
}

el('track').addEventListener('change', function () {
  geolocation.setTracking(this.checked);
});


var latitude = null;
var longitude = null;

el('push').addEventListener('click', function () {

  var raw = document.getElementById('nmea').value;

  const data = nmea.parse(raw);

  console.log(data.loc.geojson.coordinates[1]);
  console.log(data.loc.geojson.coordinates[0]);

  latitude = data.loc.geojson.coordinates[1];
  longitude = data.loc.geojson.coordinates[0];


  el('accuracy').innerText = "undefined";
  el('altitude').innerText = "undefined";
  el('altitudeAccuracy').innerText = "undefined";
  el('heading').innerText = "undefined";
  el('speed').innerText = data.loc.kmh + ' [km/h]';
  el('json').innerText = JSON.stringify(data);
  // addFeature(latitude, longitude)

  window.setInterval(addFeature(longitude, latitude), 1000);
});


function addFeature(x, y) {

  var geom = new Point(fromLonLat([x, y]));
  var feature = new Feature(geom);
  source.addFeature(feature);
}


var duration = 3000;
function flash(feature) {
  var start = new Date().getTime();
  var listenerKey = tileLayer.on('postrender', animate);

  function animate(event) {
    var vectorContext = getVectorContext(event);
    var frameState = event.frameState;
    var flashGeom = feature.getGeometry().clone();
    var elapsed = frameState.time - start;
    var elapsedRatio = elapsed / duration;
    // radius will be 5 at start and 30 at end.
    var radius = easeOut(elapsedRatio) * 25 + 5;
    var opacity = easeOut(1 - elapsedRatio);

    var style = new Style({
      image: new CircleStyle({
        radius: radius,
        stroke: new Stroke({
          color: 'rgba(255, 0, 0, ' + opacity + ')',
          width: 0.25 + opacity
        })
      })
    });

    vectorContext.setStyle(style);
    vectorContext.drawGeometry(flashGeom);
    if (elapsed > duration) {
      unByKey(listenerKey);
      return;
    }
    // tell OpenLayers to continue postrender animation
    map.render();
  }
}

source.on('addfeature', function (e) {
  flash(e.feature);
});

// update the HTML page when the position changes.
geolocation.on('change', function () {
  console.log(geolocation);
  el('accuracy').innerText = geolocation.getAccuracy() + ' [m]';
  el('altitude').innerText = geolocation.getAltitude() + ' [m]';
  el('altitudeAccuracy').innerText = geolocation.getAltitudeAccuracy() + ' [m]';
  el('heading').innerText = geolocation.getHeading() + ' [rad]';
  el('speed').innerText = geolocation.getSpeed() + ' [m/s]';
  el('json').innerText = "undefined";
});

// handle geolocation error.
geolocation.on('error', function (error) {
  var info = document.getElementById('info');
  info.innerHTML = error.message;
  info.style.display = '';
});

var accuracyFeature = new Feature();
geolocation.on('change:accuracyGeometry', function () {
  accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
});

var positionFeature = new Feature();
positionFeature.setStyle(new Style({
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({
      color: '#3399CC'
    }),
    stroke: new Stroke({
      color: '#fff',
      width: 2
    })
  })
}));

geolocation.on('change:position', function () {

  var coordinates = geolocation.getPosition();

  //console.log(coordinates);
  console.log(geolocation.getPosition());
  positionFeature.setGeometry(coordinates ?
    new Point(coordinates) : null);
});


new VectorLayer({
  map: map,
  source: new VectorSource({
    features: [accuracyFeature, positionFeature]
  })
});



