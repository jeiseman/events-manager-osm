
/*
 * MAP FUNCTIONS - OSM
 */
var em_maps_loaded = false;
var maps = {};
var maps_markers = {};
var infoWindow;

function em_maps_load() {}

jQuery(document).ready(function($) {
    em_maps();
});

jQuery(document).on('em_view_loaded_map', function(e, view, form) {
    if (!em_maps_loaded) {
        em_maps_load();
    } else {
        let map = view.find('div.em-locations-map');
        em_maps_load_locations(map[0]);
    }
});

function em_maps_load_locations(element) {
    let el = element;
    let map_id = el.getAttribute('id').replace('em-locations-map-', '');
    let em_data;
    if (document.getElementById('em-locations-map-coords-' + map_id)) {
        em_data = JSON.parse(document.getElementById('em-locations-map-coords-' + map_id).text);
    } else {
        let coords_data = el.parentElement.querySelector('.em-locations-map-coords');
        if (coords_data) {
            em_data = JSON.parse(coords_data.text);
        } else {
            em_data = {};
        }
    }
    jQuery.getJSON(document.URL, em_data, function(data) {
        if (data.length > 0) {
            maps[map_id] = L.map(el).setView([0, 0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(maps[map_id]);

            maps_markers[map_id] = [];
            var bounds = L.latLngBounds();

            jQuery.map(data, function(location, i) {
                if (!(location.location_latitude == 0 && location.location_longitude == 0)) {
                    var latitude = parseFloat(location.location_latitude);
                    var longitude = parseFloat(location.location_longitude);
                    var location_position = L.latLng(latitude, longitude);

                    var marker = L.marker(location_position).addTo(maps[map_id]);
                    maps_markers[map_id].push(marker);
                    marker.bindPopup(location.location_balloon);
                    bounds.extend(location_position);
                }
            });

            maps[map_id].fitBounds(bounds);

            document.dispatchEvent(new CustomEvent('em_maps_locations_hook', {
                detail: {
                    map: maps[map_id],
                    data: data,
                    id: map_id,
                    markers: maps_markers[map_id],
                    el: el,
                },
                cancellable: true,
            }));
        } else {
            el.firstElementChild.innerHTML = 'No locations found';

            document.dispatchEvent(new CustomEvent('em_maps_locations_hook_not_found', {
                detail: {
                    id: map_id,
                    el: el
                },
                cancellable: true,
            }));
        }
    });
}

function em_maps_load_location(el) {
    el = jQuery(el);
    var map_id = el.attr('id').replace('em-location-map-', '');
    var lat = jQuery('#em-location-map-coords-' + map_id + ' .lat').text();
    var lng = jQuery('#em-location-map-coords-' + map_id + ' .lng').text();
    var em_LatLng = L.latLng(lat, lng);

    maps[map_id] = L.map(document.getElementById('em-location-map-' + map_id)).setView(em_LatLng, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(maps[map_id]);

    maps_markers[map_id] = L.marker(em_LatLng).addTo(maps[map_id]);
    var balloon_content = jQuery('#em-location-map-info-' + map_id + ' .em-map-balloon').html();
    maps_markers[map_id].bindPopup(balloon_content).openPopup();
    maps[map_id].invalidateSize();
}

jQuery(document).on('em_search_ajax', function(e, vars, wrapper) {
    if (em_maps_loaded) {
        wrapper.find('div.em-location-map').each(function(index, el) {
            em_maps_load_location(el);
        });
        wrapper.find('div.em-locations-map').each(function(index, el) {
            em_maps_load_locations(el);
        });
    }
});

function em_maps() {
    jQuery('div.em-location-map').each(function(index, el) {
        em_maps_load_location(el);
    });
    jQuery('div.em-locations-map').each(function(index, el) {
        em_maps_load_locations(el);
    });

    //Location stuff - only needed if inputs for location exist
    if( jQuery('select#location-select-id, input#location-address').length > 0 ){
        var map, marker;
        //load map info
        var refresh_map_location = function(){
            var location_latitude = jQuery('#location-latitude').val();
            var location_longitude = jQuery('#location-longitude').val();
            let hasCoords = location_latitude != 0 || location_longitude != 0;
            if( hasCoords ){
                var position = L.latLng(location_latitude, location_longitude); //the location coords
                marker.setLatLng(position);
                var mapTitle = (jQuery('input#location-name').length > 0) ? jQuery('input#location-name').val():jQuery('input#title').val();
                mapTitle = em_esc_attr(mapTitle);

                var balloon_content = '<div id="location-balloon-content"><strong>' + mapTitle + '</strong><br>' +
                                        em_esc_attr(jQuery('#location-address').val()) +
                                        '<br>' + em_esc_attr(jQuery('#location-town').val()) +
                                        '</div>';
                marker.bindPopup(balloon_content).openPopup();

                jQuery('#em-map').show();
                jQuery('#em-map-404').hide();
                map.setView(position);
                map.invalidateSize();
            } else {
                jQuery('#em-map').hide();
                jQuery('#em-map-404').show();
            }
        };

        //Add listeners for changes to address
        var get_map_by_id = function(id){
            if(jQuery('#em-map').length > 0){
                jQuery('#em-map-404 .em-loading-maps').show();
                jQuery.getJSON(document.URL,{ em_ajax_action:'get_location', id:id }, function(data){
                    let hasCoords = data.location_latitude != 0 && data.location_longitude != 0;
                    if( hasCoords ){
                        loc_latlng = L.latLng(data.location_latitude, data.location_longitude);
                        marker.setLatLng(loc_latlng);

                        marker.bindPopup(data.location_balloon).openPopup();

                        jQuery('#em-map').show();
                        jQuery('#em-map-404').hide();
                        jQuery('#em-map-404 .em-loading-maps').hide();
                        map.setView(loc_latlng);
                        map.invalidateSize();
                    }else{
                        jQuery('#em-map').hide();
                        jQuery('#em-map-404').show();
                        jQuery('#em-map-404 .em-loading-maps').hide();
                    }
                });
            }
        };
        jQuery('#location-select-id, input#location-id').on('change', function() { get_map_by_id( jQuery(this).val() ); } );
        var geocode_timeout;
        jQuery('#location-name, #location-town, #location-address, #location-state, #location-postcode, #location-country').on('input', function() {
            var that = this;
            clearTimeout(geocode_timeout);
            geocode_timeout = setTimeout(function() {
                //build address
            if( jQuery(that).prop('readonly') === true ) return;
                var addresses = [ jQuery('#location-address').val(), jQuery('#location-town').val(), jQuery('#location-state').val(), jQuery('#location-postcode').val() ];
                var address = '';
                jQuery.each( addresses, function(i, val){
                    if( val != '' ){
                        address = ( address == '' ) ? address+val:address+', '+val;
                    }
                });
                //do country last, as it's using the text version
                if( jQuery('#location-country option:selected').val() != 0 ){
                address = ( address == '' ) ? address+jQuery('#location-country option:selected').text():address+', '+jQuery('#location-country option:selected').text();
                }
                //add working indcator whilst we search
                jQuery('#em-map-404 .em-loading-maps').show();
                //search!
                if( address != '' && jQuery('#em-map').length > 0 ){
                    jQuery.get('https://nominatim.openstreetmap.org/search?format=json&q=' + address, function(data) {
                        if (data.length > 0) {
                            jQuery('#location-latitude').val(data[0].lat);
                            jQuery('#location-longitude').val(data[0].lon);
                        }
                        refresh_map_location();
                    });
                }
            }, 500);
        });
        jQuery('#location-name, #location-town, #location-address, #location-state, #location-postcode, #location-country').on('change', function(){
            //build address
            if( jQuery(this).prop('readonly') === true ) return;
            var addresses = [ jQuery('#location-address').val(), jQuery('#location-town').val(), jQuery('#location-state').val(), jQuery('#location-postcode').val() ];
            var address = '';
            jQuery.each( addresses, function(i, val){
                if( val != '' ){
                    address = ( address == '' ) ? address+val:address+', '+val;
                }
            });
            if( address == '' ){ //in case only name is entered, no address
                jQuery('#em-map').hide();
                jQuery('#em-map-404').show();
                return false;
            }
            //do country last, as it's using the text version
            if( jQuery('#location-country option:selected').val() != 0 ){
                address = ( address == '' ) ? address+jQuery('#location-country option:selected').text():address+', '+jQuery('#location-country option:selected').text();
            }
            //add working indcator whilst we search
            jQuery('#em-map-404 .em-loading-maps').show();
            //search!
            if( address != '' && jQuery('#em-map').length > 0 ){
                jQuery.get('https://nominatim.openstreetmap.org/search?format=json&q=' + address, function(data) {
                    if (data.length > 0) {
                        jQuery('#location-latitude').val(data[0].lat);
                        jQuery('#location-longitude').val(data[0].lon);
                    }
                    refresh_map_location();
                });
            }
        });
        // Check if we are on a location editing page, and if address was previously entered, if so we check location coords
        let location_latitude = jQuery('#location-latitude').val();
        let location_longitude = jQuery('#location-longitude').val();
        let hasCoords = location_latitude != 0 || location_longitude != 0;
        if ( !hasCoords  ) {
            // check if there's any address items that were added previously
            if ( document.getElementById('location-address')?.value != '' && (document.getElementById('location-address')?.value != '' || document.getElementById('location-town')?.value != '' || document.getElementById('location-state')?.value != '' || document.getElementById('location-postcode')?.value != '' ) ) {
                // trigger a change so we reload the address and coords
                jQuery('#location-address').trigger('change');
            }
        }

        //Load map
        if(jQuery('#em-map').length > 0){
            var em_LatLng = L.latLng(0, 0);
            map = L.map('em-map').setView(em_LatLng, 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            marker = L.marker(em_LatLng, {
                draggable: true
            }).addTo(map);

            marker.on('dragend', function() {
                var position = marker.getLatLng();
                jQuery('#location-latitude').val(position.lat);
                jQuery('#location-longitude').val(position.lng);
                map.setView(position);
            });

            if( jQuery('#location-select-id').length > 0 ){
                jQuery('#location-select-id').trigger('change');
            }else{
                refresh_map_location();
            }
        }
    }

    em_maps_loaded = true;
    jQuery(document).triggerHandler('em_maps_loaded');
}

function em_esc_attr(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/</gi, '&lt;').replace(/>/gi, '&gt;');
}
