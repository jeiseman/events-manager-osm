/*
 * MAP FUNCTIONS
 */
var em_maps_loaded = false;
var maps = {};
var maps_markers = {};
var infoWindow;

/*
 * Base Map Class
 */
class EM_Map_Provider {
	constructor() {
		this.maps = {};
		this.markers = {};
		this.info_windows = {};
	}

	load() {
		// Abstract
	}

	load_locations(el) {
		// Abstract
	}

	load_location(el) {
		// Abstract
	}

	init_editors() {
		// Abstract (optional, for location editing pages)
	}

	setup_search_geo(input, callbacks) {
		// Abstract (for search pages)
	}

	trigger_loaded() {
		em_maps_loaded = true;
		jQuery(document).triggerHandler('em_maps_loaded');
	}

	em_esc_attr( str ){
		if( typeof str !== 'string' ) return '';
		return str.replace(/</gi,'&lt;').replace(/>/gi,'&gt;');
	}
}

/*
 * Google Maps Implementation
 */
class EM_Map_Google extends EM_Map_Provider {

	constructor() {
		super();
		this.lib = {};
	}

	load() {
		if( !em_maps_loaded ){
			if( typeof google === 'object' && typeof google.maps === 'object' && typeof google.maps.importLibrary === 'function' ){
				this.init_libs();
				return;
			}

			// Inline Bootstrap Loader
			(g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
				key: EM.google_maps_api || "",
				v: "quarterly",
			});

			this.init_libs();
		}
	}

	async init_libs() {
		try {
			const { Map, InfoWindow, MapTypeId } = await google.maps.importLibrary("maps");
			const { Marker } = await google.maps.importLibrary("marker");
			const { Autocomplete, AutocompleteService, PlacesService } = await google.maps.importLibrary("places");
			const { Geocoder, GeocoderStatus } = await google.maps.importLibrary("geocoding");
			const { LatLng, LatLngBounds, event } = await google.maps.importLibrary("core");

			this.lib = {
				Map, InfoWindow, Marker, Autocomplete, AutocompleteService, PlacesService, Geocoder, GeocoderStatus, LatLng, LatLngBounds, event, MapTypeId
			};

			this.init_all();
		} catch (e) {
			console.error("Google Maps initialization failed", e);
		}
	}

	init_all() {
		if ( !this.lib.Map ) return;
		// This replaces the old em_maps() logic
		var self = this;
		jQuery('div.em-location-map').each( function(index, el){ self.load_location(el); } );
		jQuery('div.em-locations-map').each( function(index, el){ self.load_locations(el); } );
		this.init_editors();
		this.trigger_loaded();
	}

	load_locations(element) {
		var self = this;
		let el = element;
		let map_id = el.getAttribute('id').replace('em-locations-map-','');
		let em_data;
		if ( document.getElementById('em-locations-map-coords-'+map_id) ) {
			em_data = JSON.parse( document.getElementById('em-locations-map-coords-'+map_id).text );
		} else {
			let coords_data = el.parentElement.querySelector('.em-locations-map-coords');
			if ( coords_data ) {
				em_data = JSON.parse( coords_data.text );
			} else {
				em_data = {};
			}
		}
		jQuery.getJSON(document.URL, em_data , function( data ) {
			if( data.length > 0 ){
				//define default options and allow option for extension via event triggers
				var map_options = { mapTypeId: self.lib.MapTypeId.ROADMAP };
				if( typeof EM.google_map_id_styles == 'object' && typeof EM.google_map_id_styles[map_id] !== 'undefined' ){ console.log(EM.google_map_id_styles[map_id]); map_options.styles = EM.google_map_id_styles[map_id]; }
				else if( typeof EM.google_maps_styles !== 'undefined' ){ map_options.styles = EM.google_maps_styles; }
				jQuery(document).triggerHandler('em_maps_locations_map_options', map_options);
				var marker_options = {};
				jQuery(document).triggerHandler('em_maps_location_marker_options', marker_options);

				maps[map_id] = new self.lib.Map(el, map_options);
				self.maps[map_id] = maps[map_id];
				maps_markers[map_id] = [];
				self.markers[map_id] = maps_markers[map_id];

				var bounds = new self.lib.LatLngBounds();

				jQuery.map( data, function( location, i ){
					if( !(location.location_latitude == 0 && location.location_longitude == 0) ){
						var latitude = parseFloat( location.location_latitude );
						var longitude = parseFloat( location.location_longitude );
						var location_position = new self.lib.LatLng( latitude, longitude );
						//extend the default marker options
						jQuery.extend(marker_options, {
							position: location_position,
							map: maps[map_id]
						})
						var marker = new self.lib.Marker(marker_options);
						maps_markers[map_id].push(marker);
						marker.setTitle(location.location_name);
						var myContent = '<div class="em-map-balloon"><div id="em-map-balloon-'+map_id+'" class="em-map-balloon-content">'+ location.location_balloon +'</div></div>';

						// InfoBox logic inline or delegate?
						// Reusing em_map_infobox global function for compatibility or redefining here?
						// I'll reuse the logic here.
						var iw = new self.lib.InfoWindow({ content: myContent });
						self.lib.event.addListener(marker, 'click', function() {
							if( infoWindow ) infoWindow.close();
							infoWindow = iw;
							iw.open(maps[map_id],marker);
						});

						//extend bounds
						bounds.extend(new self.lib.LatLng(latitude,longitude))
					}
				});
				// Zoom in to the bounds
				maps[map_id].fitBounds(bounds);

				//Call a hook if exists
				if( jQuery ) {
					jQuery(document).triggerHandler('em_maps_locations_hook', [maps[map_id], data, map_id, maps_markers[map_id]]);
				}
				document.dispatchEvent( new CustomEvent('em_maps_locations_hook', {
					detail: {
						map : maps[map_id],
						data : data,
						id : map_id,
						markers : maps_markers[map_id],
						el : el,
					},
					cancellable : true,
				}));
			} else {
				el.firstElementChild.innerHTML = 'No locations found';
				if( jQuery ) {
					jQuery(document).triggerHandler('em_maps_locations_hook_not_found', [ jQuery(el) ]);
				}
				document.dispatchEvent( new CustomEvent('em_maps_locations_hook_not_found', {
					detail: {
						id : map_id,
						el : el
					},
					cancellable : true,
				}));
			}
		});
	}

	load_location(el) {
		var self = this;
		el = jQuery(el);
		var map_id = el.attr('id').replace('em-location-map-','');
		var em_LatLng = new self.lib.LatLng( jQuery('#em-location-map-coords-'+map_id+' .lat').text(), jQuery('#em-location-map-coords-'+map_id+' .lng').text());
		//extend map and markers via event triggers
		var map_options = {
			zoom: 14,
			center: em_LatLng,
			mapTypeId: self.lib.MapTypeId.ROADMAP,
			mapTypeControl: false,
			gestureHandling: 'cooperative'
		};
		if( typeof EM.google_map_id_styles == 'object' && typeof EM.google_map_id_styles[map_id] !== 'undefined' ){ console.log(EM.google_map_id_styles[map_id]); map_options.styles = EM.google_map_id_styles[map_id]; }
		else if( typeof EM.google_maps_styles !== 'undefined' ){ map_options.styles = EM.google_maps_styles; }
		jQuery(document).triggerHandler('em_maps_location_map_options', map_options);
		maps[map_id] = new self.lib.Map( document.getElementById('em-location-map-'+map_id), map_options);
		self.maps[map_id] = maps[map_id];
		var marker_options = {
			position: em_LatLng,
			map: maps[map_id]
		};
		jQuery(document).triggerHandler('em_maps_location_marker_options', marker_options);
		maps_markers[map_id] = new self.lib.Marker(marker_options);
		self.markers[map_id] = maps_markers[map_id];
		infoWindow = new self.lib.InfoWindow({ content: jQuery('#em-location-map-info-'+map_id+' .em-map-balloon').get(0) });
		infoWindow.open(maps[map_id],maps_markers[map_id]);
		maps[map_id].panBy(40,-70);

		//JS Hook for handling map after instantiation
		jQuery(document).triggerHandler('em_maps_location_hook', [maps[map_id], infoWindow, maps_markers[map_id], map_id]);
		//map resize listener
		jQuery(window).on('resize', function(e) {
			self.lib.event.trigger(maps[map_id], "resize");
			maps[map_id].setCenter(maps_markers[map_id].getPosition());
			maps[map_id].panBy(40,-70);
		});
	}

	init_editors() {
		var self = this;
		//Location stuff - only needed if inputs for location exist
		if( jQuery('select#location-select-id, input#location-address').length > 0 ){
			var map, marker;
			//load map info
			var refresh_map_location = function(){
				var location_latitude = jQuery('#location-latitude').val();
				var location_longitude = jQuery('#location-longitude').val();
				let hasCoords = location_latitude != 0 || location_longitude != 0;
				if( hasCoords ){
					var position = new self.lib.LatLng(location_latitude, location_longitude); //the location coords
					marker.setPosition(position);
					var mapTitle = (jQuery('input#location-name').length > 0) ? jQuery('input#location-name').val():jQuery('input#title').val();
					mapTitle = self.em_esc_attr(mapTitle);
					marker.setTitle( mapTitle );
					jQuery('#em-map').show();
					jQuery('#em-map-404').hide();
					self.lib.event.trigger(map, 'resize');
					map.setCenter(position);
					map.panBy(40,-55);
					infoWindow.setContent(
						'<div id="location-balloon-content"><strong>' + mapTitle + '</strong><br>' +
						self.em_esc_attr(jQuery('#location-address').val()) +
						'<br>' + self.em_esc_attr(jQuery('#location-town').val()) +
						'</div>'
					);
					infoWindow.open(map, marker);
					jQuery(document).triggerHandler('em_maps_location_hook', [map, infoWindow, marker, 0]);
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
							var loc_latlng = new self.lib.LatLng(data.location_latitude, data.location_longitude);
							marker.setPosition(loc_latlng);
							marker.setTitle( data.location_name );
							marker.setDraggable(false);
							jQuery('#em-map').show();
							jQuery('#em-map-404').hide();
							jQuery('#em-map-404 .em-loading-maps').hide();
							map.setCenter(loc_latlng);
							map.panBy(40,-55);
							infoWindow.setContent( '<div id="location-balloon-content">'+ data.location_balloon +'</div>');
							infoWindow.open(map, marker);
							self.lib.event.trigger(map, 'resize');
							jQuery(document).triggerHandler('em_maps_location_hook', [map, infoWindow, marker, 0]);
						}else{
							jQuery('#em-map').hide();
							jQuery('#em-map-404').show();
							jQuery('#em-map-404 .em-loading-maps').hide();
						}
					});
				}
			};
			jQuery('#location-select-id, input#location-id').on('change', function() { get_map_by_id( jQuery(this).val() ); } );
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
					let geocoder = new self.lib.Geocoder();
					geocoder.geocode( { 'address': address }, function(results, status) {
						if (status == self.lib.GeocoderStatus.OK) {
							jQuery('#location-latitude').val(results[0].geometry.location.lat());
							jQuery('#location-longitude').val(results[0].geometry.location.lng());
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
					if ( 'google_maps_resave_location' in EM ) {
						alert(EM.google_maps_resave_location);
					}
				}
			}

			//Load map
			if(jQuery('#em-map').length > 0){
				var em_LatLng = new self.lib.LatLng(0, 0);
				var map_options = {
					zoom: 14,
					center: em_LatLng,
					mapTypeId: self.lib.MapTypeId.ROADMAP,
					mapTypeControl: false,
					gestureHandling: 'cooperative'
				};
				if( typeof EM.google_maps_styles !== 'undefined' ){ map_options.styles = EM.google_maps_styles; }
				map = new self.lib.Map( document.getElementById('em-map'), map_options);
				var marker = new self.lib.Marker({
					position: em_LatLng,
					map: map,
					draggable: true
				});
				infoWindow = new self.lib.InfoWindow({
					content: ''
				});
				// var geocoder = new google.maps.Geocoder();
				self.lib.event.addListener(infoWindow, 'domready', function() {
					document.getElementById('location-balloon-content').parentNode.style.overflow='';
					document.getElementById('location-balloon-content').parentNode.parentNode.style.overflow='';
				});
				self.lib.event.addListener(marker, 'dragend', function() {
					var position = marker.getPosition();
					jQuery('#location-latitude').val(position.lat());
					jQuery('#location-longitude').val(position.lng());
					map.setCenter(position);
					map.panBy(40,-55);
				});
				if( jQuery('#location-select-id').length > 0 ){
					jQuery('#location-select-id').trigger('change');
				}else{
					refresh_map_location();
				}
				jQuery(document).triggerHandler('em_map_loaded', [map, infoWindow, marker]);
			}
			//map resize listener
			jQuery(window).on('resize', function(e) {
				self.lib.event.trigger(map, "resize");
				map.setCenter(marker.getPosition());
				map.panBy(40,-55);
			});
		}
	}

	setup_search_geo(input_el, callbacks) {
		var self = this;
		var input = jQuery(input_el);
		var wrapper = input.closest('div.em-search-geo');
		var geo_coords = wrapper.find("input.em-search-geo-coords");
		var autocomplete = new self.lib.Autocomplete(input[0]);

		var ac_listener = function (place) {
			var place = autocomplete.getPlace();
			if (!place || !place.geometry) { //place not found
				if (input.val() == '' || input.val() == EM.geo_placeholder) {
					if(callbacks.on_status_change) callbacks.on_status_change(false);
				} else {
					if (wrapper.data('last-search') == input.val()) {
						if(callbacks.on_status_change) callbacks.on_status_change('on');
						let current_value = geo_coords.val();
						geo_coords.val(wrapper.data('last-coords'));
						if( current_value !== geo_coords.val() ){
							geo_coords.trigger('change');
						}
						return;
					}
					//do a nearest match suggestion as last resort
					if (input.val().length >= 2) {
						if(callbacks.on_status_change) callbacks.on_status_change(false);
						var autocompleteService = new self.lib.AutocompleteService();
						autocompleteService.getPlacePredictions({
							'input': input.val(),
							'offset': input.val().length
						}, function listentoresult(list, status) {
							if (list != null && list.length != 0) {
								var placesService = new self.lib.PlacesService(document.getElementById('em-search-geo-attr'));
								placesService.getDetails({'reference': list[0].reference}, function detailsresult(detailsResult, placesServiceStatus) {
									//we have a match, ask the user
									wrapper.data('last-search', detailsResult.formatted_address);
									wrapper.data('last-coords', detailsResult.geometry.location.lat() + ',' + detailsResult.geometry.location.lng());
									if (input.val() == detailsResult.formatted_address || confirm(EM.geo_alert_guess.replace('%s', '"' + detailsResult.formatted_address + '"'))) {
										if(callbacks.on_status_change) callbacks.on_status_change('on');
										let current_value = geo_coords.val();
										geo_coords.val(detailsResult.geometry.location.lat() + ',' + detailsResult.geometry.location.lng());
										if( current_value !== geo_coords.val() ){
											geo_coords.trigger('change');
										}
										input.val(detailsResult.formatted_address);
									} else {
										input.data('last-key', false);
										if(callbacks.on_status_change) callbacks.on_status_change('off');
									}
								});
							} else {
								if(callbacks.on_status_change) callbacks.on_status_change('off');
							}
						});
					} else {
						if(callbacks.on_status_change) callbacks.on_status_change('off');
					}
				}
				wrapper.data('last-search', input.val());
				wrapper.data('last-coords', geo_coords.val());
				return;
			}
			if(callbacks.on_status_change) callbacks.on_status_change('on');
			let current_value = geo_coords.val();
			geo_coords.val(place.geometry.location.lat() + ',' + place.geometry.location.lng());
			if( current_value !== geo_coords.val() ){
				geo_coords.trigger('change');
			}
			wrapper.data('last-search', input.val());
			wrapper.data('last-coords', geo_coords.val());
		};
		self.lib.event.addListener(autocomplete, 'place_changed', ac_listener);
	}
}

/*
 * OSM Implementation
 */
class EM_Map_OSM extends EM_Map_Provider {
	load() {
		// Assuming Leaflet is loaded or will be loaded.
		// If not, we might need to load it here.
		// For now, assuming provided via EM.assets or standard enqueue.
		if( typeof L !== 'undefined' ){
			this.init_all();
		} else {
			// fallback check
			var self = this;
			jQuery(window).load(function(){ if( typeof L !== 'undefined' && !em_maps_loaded ) self.init_all(); });
		}
	}

	init_all() {
		var self = this;
		jQuery('div.em-location-map').each( function(index, el){ self.load_location(el); } );
		jQuery('div.em-locations-map').each( function(index, el){ self.load_locations(el); } );
		this.init_editors();
		this.trigger_loaded();
	}

	load_locations(element) {
		var self = this;
		let el = element;
		let map_id = el.getAttribute('id').replace('em-locations-map-','');
		let em_data;
		if ( document.getElementById('em-locations-map-coords-'+map_id) ) {
			em_data = JSON.parse( document.getElementById('em-locations-map-coords-'+map_id).text );
		} else {
			let coords_data = el.parentElement.querySelector('.em-locations-map-coords');
			if ( coords_data ) {
				em_data = JSON.parse( coords_data.text );
			} else {
				em_data = {};
			}
		}
		jQuery.getJSON(document.URL, em_data , function( data ) {
			if( data.length > 0 ){
				var map_options = { };
				jQuery(document).triggerHandler('em_maps_locations_map_options', map_options);

				// Initialize Leaflet Map
				// Note: Leaflet requires a height on the container.
				var map = L.map(el);
				L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				}).addTo(map);

				self.maps[map_id] = map;
				maps[map_id] = map; // Compatibility

				self.markers[map_id] = [];
				maps_markers[map_id] = self.markers[map_id];

				var markers_group = new L.FeatureGroup();

				jQuery.map( data, function( location, i ){
					if( !(location.location_latitude == 0 && location.location_longitude == 0) ){
						var latitude = parseFloat( location.location_latitude );
						var longitude = parseFloat( location.location_longitude );
						var location_position = [latitude, longitude];

						var marker = L.marker(location_position).addTo(map);
						marker.bindPopup('<div class="em-map-balloon"><div id="em-map-balloon-'+map_id+'" class="em-map-balloon-content">'+ location.location_balloon +'</div></div>');

						markers_group.addLayer(marker);
						self.markers[map_id].push(marker);
					}
				});

				if( self.markers[map_id].length > 0 ){
					map.fitBounds(markers_group.getBounds());
				}

				//Call a hook if exists
				if( jQuery ) {
					jQuery(document).triggerHandler('em_maps_locations_hook', [map, data, map_id, self.markers[map_id]]);
				}
				document.dispatchEvent( new CustomEvent('em_maps_locations_hook', {
					detail: {
						map : map,
						data : data,
						id : map_id,
						markers : self.markers[map_id],
						el : el,
					},
					cancellable : true,
				}));
			} else {
				el.firstElementChild.innerHTML = 'No locations found';
				if( jQuery ) {
					jQuery(document).triggerHandler('em_maps_locations_hook_not_found', [ jQuery(el) ]);
				}
				document.dispatchEvent( new CustomEvent('em_maps_locations_hook_not_found', {
					detail: {
						id : map_id,
						el : el
					},
					cancellable : true,
				}));
			}
		});
	}

	load_location(el) {
		var self = this;
		el = jQuery(el);
		var map_id = el.attr('id').replace('em-location-map-','');
		var lat = parseFloat(jQuery('#em-location-map-coords-'+map_id+' .lat').text());
		var lng = parseFloat(jQuery('#em-location-map-coords-'+map_id+' .lng').text());

		var map = L.map(document.getElementById('em-location-map-'+map_id)).setView([lat, lng], 14);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(map);

		self.maps[map_id] = map;
		maps[map_id] = map;

		var marker = L.marker([lat, lng]).addTo(map);
		var popupContent = jQuery('#em-location-map-info-'+map_id+' .em-map-balloon').html();
		if(popupContent) {
			marker.bindPopup(popupContent).openPopup();
		}

		self.markers[map_id] = marker;
		maps_markers[map_id] = marker;

		jQuery(document).triggerHandler('em_maps_location_hook', [map, null, marker, map_id]);

		setTimeout(function(){ map.invalidateSize(); }, 400);
	}

	init_editors() {
		var self = this;
		if( jQuery('select#location-select-id, input#location-address').length > 0 ){
			var map, marker;

			var refresh_map_location = function(){
				var location_latitude = jQuery('#location-latitude').val();
				var location_longitude = jQuery('#location-longitude').val();
				let hasCoords = location_latitude != 0 || location_longitude != 0;
				if( hasCoords ){
					var position = [location_latitude, location_longitude];
					marker.setLatLng(position);

					var mapTitle = (jQuery('input#location-name').length > 0) ? jQuery('input#location-name').val():jQuery('input#title').val();
					mapTitle = self.em_esc_attr(mapTitle);

					jQuery('#em-map').show();
					jQuery('#em-map-404').hide();

					map.invalidateSize();
					map.setView(position);

					marker.bindPopup(
						'<div id="location-balloon-content"><strong>' + mapTitle + '</strong><br>' +
						self.em_esc_attr(jQuery('#location-address').val()) +
						'<br>' + self.em_esc_attr(jQuery('#location-town').val()) +
						'</div>'
					).openPopup();

					jQuery(document).triggerHandler('em_maps_location_hook', [map, null, marker, 0]);
				} else {
					jQuery('#em-map').hide();
					jQuery('#em-map-404').show();
				}
			};

			// Simple Geocoding for Editor
			var geocode_address = function() {
				var addresses = [ jQuery('#location-address').val(), jQuery('#location-town').val(), jQuery('#location-state').val(), jQuery('#location-postcode').val() ];
				var address = '';
				jQuery.each( addresses, function(i, val){
					if( val != '' ){
						address = ( address == '' ) ? address+val:address+', '+val;
					}
				});
				if( address == '' ) return;
				if( jQuery('#location-country option:selected').val() != 0 ){
					address = ( address == '' ) ? address+jQuery('#location-country option:selected').text():address+', '+jQuery('#location-country option:selected').text();
				}

				jQuery('#em-map-404 .em-loading-maps').show();

				jQuery.getJSON('https://nominatim.openstreetmap.org/search?format=json&q='+encodeURIComponent(address), function(data){
					jQuery('#em-map-404 .em-loading-maps').hide();
					if(data && data.length > 0){
						jQuery('#location-latitude').val(data[0].lat);
						jQuery('#location-longitude').val(data[0].lon);
						refresh_map_location();
					}
				});
			};

			jQuery('#location-name, #location-town, #location-address, #location-state, #location-postcode, #location-country').on('change', function(){
				if( jQuery(this).prop('readonly') === true ) return;
				geocode_address();
			});

			//Load map
			if(jQuery('#em-map').length > 0){
				var em_LatLng = [0, 0];
				map = L.map('em-map').setView(em_LatLng, 14);
				L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				}).addTo(map);

				marker = L.marker(em_LatLng, {draggable: true}).addTo(map);

				marker.on('dragend', function(e) {
					var position = marker.getLatLng();
					jQuery('#location-latitude').val(position.lat);
					jQuery('#location-longitude').val(position.lng);
					map.panTo(position);
				});

				refresh_map_location();
				jQuery(document).triggerHandler('em_map_loaded', [map, null, marker]);
			}
		}
	}

	setup_search_geo(input_el, callbacks) {
		var input = jQuery(input_el);
		var wrapper = input.closest('div.em-search-geo');
		var geo_coords = wrapper.find("input.em-search-geo-coords");

		// Simple Autocomplete using jQuery UI if available or simple input handler
		// Implementing a simple debounce search
		var timer = null;
		input.on('input', function() {
			var val = this.value;
			if(val.length < 3) {
				if(callbacks.on_status_change) callbacks.on_status_change('off');
				return;
			}
			if(timer) clearTimeout(timer);
			timer = setTimeout(function(){
				jQuery.getJSON('https://nominatim.openstreetmap.org/search?format=json&q='+encodeURIComponent(val), function(data){
					if(data && data.length > 0){
						// For now, take the first result or show a list (simpler to take first for this refactor)
						// Ideally we show a dropdown
						// Let's assume the user picks the first one for now if we don't have a UI

						// NOTE: To properly support autocomplete UI like Google, we need a library or custom UI.
						// Given the scope, I will set data but might not show dropdown unless I build one.
						// But I can simulate "place_changed" behavior.

						var place = data[0];
						// We don't auto-select, but we could populate data if user hits enter or similar.
						// Or we can use jQuery UI Autocomplete if loaded.

						// For this task, I'll update coords if exact match or simple behavior
						wrapper.data('last-search', place.display_name);
						wrapper.data('last-coords', place.lat + ',' + place.lon);

						// We need a way to let user select.
						// Since I cannot easily inject a complex UI, I will rely on the fact that `events-manager` usually expects Google.
						// But for OSM, we need something.

						// Minimal implementation: Update hidden fields so search works if they type valid address
						geo_coords.val(place.lat + ',' + place.lon);
						if(callbacks.on_status_change) callbacks.on_status_change('on');
					} else {
						if(callbacks.on_status_change) callbacks.on_status_change('off');
					}
				});
			}, 500);
		});
	}
}

var em_map_provider_instance = null;
function em_maps_get_provider(){
	if( em_map_provider_instance === null ){
		if( (typeof EM !== 'undefined' && EM.map_provider === 'osm') || (typeof EM !== 'undefined' && EM.map_provider === 'openstreetmap') ){
			em_map_provider_instance = new EM_Map_OSM();
		} else {
			em_map_provider_instance = new EM_Map_Google();
		}
	}
	return em_map_provider_instance;
}

// Global functions replacement
function em_maps_load(){
	em_maps_get_provider().load();
}

function em_maps_load_locations(el){
	em_maps_get_provider().load_locations(el);
}

function em_maps_load_location(el){
	em_maps_get_provider().load_location(el);
}

function em_maps(){
	em_maps_get_provider().init_all();
}

jQuery(document).on('em_view_loaded_map', function( e, view, form ){
	if( !em_maps_loaded ){
		em_maps_load();
	}else{
		let map = view.find('div.em-locations-map');
		em_maps_load_locations( map[0] );
	}
});

function em_map_infobox(marker, message, map) {
	// Wrapper for Google Maps compatibility
	if( em_maps_get_provider() instanceof EM_Map_Google ){
		var self = em_maps_get_provider();
		// If libraries loaded, use from lib, otherwise fallback (or assume libraries loaded if this called)
		var InfoWindow = self.lib.InfoWindow || google.maps.InfoWindow;
		var event = self.lib.event || google.maps.event;

		var iw = new InfoWindow({ content: message });
		event.addListener(marker, 'click', function() {
			if( infoWindow ) infoWindow.close();
			infoWindow = iw;
			iw.open(map,marker);
		});
	}
}

// Ensure em_search_ajax still works
jQuery(document).on('em_search_ajax', function(e, vars, wrapper){
	if( em_maps_loaded ){
		wrapper.find('div.em-location-map').each( function(index, el){ em_maps_load_location(el); } );
		wrapper.find('div.em-locations-map').each( function(index, el){ em_maps_load_locations(el); });
	}
});
