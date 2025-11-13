// Events Manager - OpenStreetMap Integration

// Prevent the default Google Maps from loading
function em_maps_load() {}

jQuery(document).ready(function($) {
    if ( $('div[id^="em-location-map-"]').length > 0 || $('div[id^="em-locations-map-"]').length > 0 || $('#em-map').length > 0 ) {
        em_osm_load_maps();
    }
});

var maps = {};
var maps_markers = {};

function em_osm_load_maps() {
    $('div[id^="em-location-map-"]').each(function() { em_osm_load_location(this); });
    $('div[id^="em-locations-map-"]').each(function() { em_osm_load_locations(this); });
    if ($('#em-map').length > 0) {
        em_osm_load_location_editor();
    }
}

function em_osm_load_location(map_container) {
  var map_id = $(map_container).attr('id').replace('em-location-map-', '');
    var em_data = $('#em-location-map-coords-' + map_id);
    var lat = em_data.find('.lat').text();
    var lng = em_data.find('.lng').text();


  var map = L.map(map_container).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var marker = L.marker([lat, lng]).addTo(map);
    var balloon_content = $('#em-location-map-info-' + map_id + ' .em-map-balloon').html();
    if (balloon_content) {
        marker.bindPopup(balloon_content);
    }
    maps[map_id] = map;
    maps_markers[map_id] = marker;
}

function em_osm_load_locations(map_container) {
    var map_id = $(map_container).attr('id').replace('em-locations-map-', '');
    var em_data = $.parseJSON($('#em-locations-map-coords-' + map_id).text());

    if (!em_data || !em_data.locations || em_data.locations.length === 0) {
        // Handle case where there are no locations. You might want to show a message.
        $(map_container).html('No locations to display on the map.'); // Example message
        return;
    }

    var map = L.map(map_container).setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var markers = [];
    $.each(em_data.locations, function(i, location) {
        if ((location.location_latitude != 0 && location.location_latitude !== null) || (location.location_longitude != 0 && location.location_longitude !== null)) {
            var marker = L.marker([location.location_latitude, location.location_longitude]);
            if (location.location_balloon) {
                marker.bindPopup(location.location_balloon);
            }
            markers.push(marker);
        }
    });

    if (markers.length > 0) {
        var featureGroup = L.featureGroup(markers).addTo(map);
        map.fitBounds(featureGroup.getBounds());
    } else {
      $(map_container).html('No locations with valid coordinates to display on the map.');
    }
    maps[map_id] = map;
    maps_markers[map_id] = markers;
}

function em_osm_load_location_editor() {
    var map_container = $('#em-map')[0];
    var lat = $('#location-latitude').val();
    var lng = $('#location-longitude').val();
    if (lat == 0 && lng == 0) {
        lat = 40.712776; // Default to New York
        lng = -74.005974;
    }

    var map = L.map(map_container).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    var marker = L.marker([lat, lng], {
        draggable: true
    }).addTo(map);

    marker.on('dragend', function(event) {
        var position = marker.getLatLng();
        $('#location-latitude').val(position.lat);
        $('#location-longitude').val(position.lng);
    });

    function geocodeAddress() {
        var address = $('#location-address').val() + ', ' + $('#location-town').val() + ', ' + $('#location-state').val() + ', ' + $('#location-country option:selected').text();
        $.get('https://nominatim.openstreetmap.org/search?format=json&q=' + address, function(data) {
            if (data.length > 0) {
                var lat = data[0].lat;
                var lon = data[0].lon;
                map.setView([lat, lon], 15);
                marker.setLatLng([lat, lon]);
                $('#location-latitude').val(lat);
                $('#location-longitude').val(lon);
            }
        });
    }

    $('#location-address, #location-town, #location-state, #location-country').on('change', geocodeAddress);
}
