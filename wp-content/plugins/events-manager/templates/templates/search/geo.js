jQuery(document).on('em_maps_loaded', function() {
	jQuery('input.em-search-geo').each(function () {
		var input = /** @type {HTMLInputElement} */ jQuery(this);
		var wrapper = input.closest('div.em-search-geo');
		var geo_coords = wrapper.find("input.em-search-geo-coords");

		var geo_field_status = function (status) {
			wrapper.data('status', status);
			var em_search = wrapper.closest('.em-search-legacy');
			// backcompat
			if( em_search.length > 0 ){
				// old templates - soon to be deprecated
				if( status == 'on' ){
					wrapper.css('background-image', wrapper.css('background-image').replace('search-geo.png', 'search-geo-on.png').replace('search-geo-off.png', 'search-geo-on.png'));
					em_search.find('select.em-search-country option:first-child').prop('selected','selected').trigger('change');
					em_search.find('.em-search-location').slideUp();
					em_search.find('.em-search-geo-units').slideDown();
				}else{
					if( status == 'off' ){
						wrapper.css('background-image', wrapper.css('background-image').replace('search-geo.png', 'search-geo-off.png').replace('search-geo-on.png', 'search-geo-off.png'));
					}else{
						wrapper.css('background-image', wrapper.css('background-image').replace('search-geo-off.png', 'search-geo.png').replace('search-geo-on.png', 'search-geo.png'));
					}
					let current_value = geo_coords.val();
					geo_coords.val('');
					if( current_value !== geo_coords.val() ){
						geo_coords.trigger('change');
					}
					em_search.find('.em-search-location').slideDown();
					em_search.find('.em-search-geo-units').slideUp();
				}
			}else{
				// new templates
				em_search = wrapper.closest('.em-search, .em-search-advanced');
				if( status === 'on' ){
					input.addClass('on').removeClass('off');
					em_search.find('select.em-search-country option:first-child').prop('selected','selected').trigger('change');
					em_search.find('.em-search-location').slideUp();
					em_search.find('.em-search-geo-units').slideDown();
				}else{
					if( status === 'off' ){
						input.addClass('off').removeClass('on');
					}else{
						input.removeClass('off').removeClass('on');
					}
					let current_value = geo_coords.val();
					geo_coords.val('');
					if( current_value !== geo_coords.val() ){
						geo_coords.trigger('change');
					}
					em_search.find('.em-search-location').slideDown();
					em_search.find('.em-search-geo-units').slideUp();
				}
			}
		};

		if (geo_coords.val() != '') {
			geo_field_status('on');
			wrapper.data('last-search', input.val());
			wrapper.data('last-coords', geo_coords.val());
		}

		input.on('keydown', function (e) {
			//if enter is pressed once during 'near' input, don't do anything so Google can select location, otherwise let behavior (form submittal) proceed
			if (e.which == 13) {
				if (this.getAttribute('data-last-key') != 13 || wrapper.data('status') != 'on') {
					e.preventDefault();
				}
			} else if( e.which == 8 && this.classList.contains('on') ){
				// clear a valid search and start again
				this.value = '';
				geo_field_status(false);
			}
			this.setAttribute('data-last-key', e.which);
		}).on('keypress', function(e){
			if( e.which !== 13 && this.classList.contains('on') ){
				// clear a valid search and start again
				this.value = '';
			}
		}).on('input', function(e){
			if (this.value == '') {
				geo_field_status(false);
			} else if (wrapper.data('last-search') != this.value) {
				geo_field_status('off');
			}
		}).on('click', function(){
			const end = this.value.length;
			this.setSelectionRange(end, end);
			this.focus();
		});

		// Delegate to provider
		var callbacks = {
			on_status_change: geo_field_status
		};
		em_maps_get_provider().setup_search_geo(this, callbacks);
	});
});