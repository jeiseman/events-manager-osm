// Events Manager - OpenStreetMap Integration

// Prevent the default Google Maps from loading by overriding its initialization functions
function em_maps_load() {}
function em_maps() {}

var maps = {};
var maps_markers = {};
var editorMap; // Specific for the location editor
var editorMarker; // Specific for the location editor

jQuery(document).ready(function($) {
    // Check if we should load maps on this page
    if ($('.em-location-map').length > 0 || $('.em-locations-map').length > 0 || $('#em-map').length > 0) {
        em_osm_load_maps();
    }
});

function em_osm_load_maps() {
    $('div.em-location-map').each(function() { em_osm_load_location(this); });
    $('div.em-locations-map').each(function() { em_osm_load_locations(this); });
    if ($('#em-map').length > 0) {
        em_osm_load_location_editor();
    }
}

function em_osm_load_location(map_container) {
    var $map_container = $(map_container);
    var map_id = $map_container.attr('id').replace('em-location-map-', '');
    var em_data = $('#em-location-map-coords-' + map_id);
    var lat = em_data.find('.lat').text();
    var lng = em_data.find('.lng').text();

    if ((lat != 0 && lat !== '') || (lng != 0 && lng !== '')) {
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
}

function em_osm_load_locations(map_container) {
    var $map_container = $(map_container);
    var map_id = $map_container.attr('id').replace('em-locations-map-', '');
    var em_data = $.parseJSON($('#em-locations-map-coords-' + map_id).text());

    if (!em_data || !em_data.locations || em_data.locations.length === 0) {
        $map_container.html('No locations to display on the map.');
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
        $map_container.html('No locations with valid coordinates to display on the map.');
    }
    maps[map_id] = map;
    maps_markers[map_id] = markers;
}

function em_osm_load_location_editor() {
    var $mapContainer = jQuery('#em-map');
    var $map404 = jQuery('#em-map-404');

    function refresh_osm_map() {
        var lat = jQuery('#location-latitude').val();
        var lng = jQuery('#location-longitude').val();

        if ((lat != 0 && lat !== '') || (lng != 0 && lng !== '')) {
            $mapContainer.show();
            $map404.hide();

            if (editorMap) {
                editorMap.invalidateSize();
                editorMap.setView([lat, lng], 15);
                editorMarker.setLatLng([lat, lng]);
            } else {
                editorMap = L.map($mapContainer[0]).setView([lat, lng], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(editorMap);

                editorMarker = L.marker([lat, lng], { draggable: true }).addTo(editorMap);

                editorMarker.on('dragend', function(event) {
                    var position = editorMarker.getLatLng();
                    jQuery('#location-latitude').val(position.lat);
                    jQuery('#location-longitude').val(position.lng);
                });
            }
        } else {
            $mapContainer.hide();
            $map404.show();
        }
    }

    function geocodeAddress() {
        var address = jQuery('#location-address').val() + ', ' + jQuery('#location-town').val() + ', ' + jQuery('#location-state').val() + ', ' + jQuery('#location-country option:selected').text();
        if (address.trim().replace(/,/g, '') === '') return;

        jQuery.get('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address), function(data) {
            if (data.length > 0) {
                var lat = data[0].lat;
                var lon = data[0].lon;
                jQuery('#location-latitude').val(lat);
                jQuery('#location-longitude').val(lon);
                refresh_osm_map();
            }
        });
    }

    // Initial load
    refresh_osm_map();

    // Hook into address changes and location selection
    jQuery('#location-address, #location-town, #location-state, #location-country').on('change', geocodeAddress);
    jQuery('#location-select-id, input#location-id').on('change', function() {
        setTimeout(refresh_osm_map, 250); // Delay to allow EM to populate the fields
    });
}
