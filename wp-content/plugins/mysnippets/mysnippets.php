<?php
/**
 *
 * @wordpress-plugin
 * Plugin Name:       MySnippets
 * Plugin URI:        
 * Description:       add snippets
 * Version:           1.0.0
 * Author:            jon
 * Author URI:        
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       
 */

if ( ! defined( 'ABSPATH' ) ) exit; // Exit if accessed directly

add_shortcode('events-dbinfo', function() {
    // Access the global WordPress database object.
    global $wpdb;

    // We are selecting the ID column from the posts table where the post_type is 'post'
    // and the post_status is 'publish'.
    // Using $wpdb->prepare is a best practice for security to prevent SQL injection,
    // even when not using user-supplied data.
    // $query = $wpdb->prepare(
        // "SELECT ID, post_status, post_type FROM $wpdb->em_events LEFT JOIN $wpdb->posts ON post_id = ID"
    // );
    $query = "SELECT ID, post_status, post_type FROM " . $wpdb->prefix . "em_events LEFT JOIN $wpdb->posts ON post_id = ID";

    // Execute the query and get the results as a single flat array of IDs.
    $posts = $wpdb->get_results( $query );

    // Start output buffering to capture the HTML.
    ob_start();

    // Check if the query returned any post IDs.
    if ( ! empty( $posts ) ) {
        echo '<ul>';

        // Loop through the array of post IDs.
        foreach ( $posts as $post ) {
            // Output each post ID within a list item.
            // esc_html() is used for security to escape the output.
            echo '<li>Post ID: ' . esc_html( $post->ID ) . ' post_status: ' . $post->post_status . ' post_type: ' . esc_html( $post->post_type ) . '</li>';
        }

        echo '</ul>';
    } else {
        // If no posts are found, display a message.
        echo '<p>No published posts found.</p>';
    }

    // Return the captured HTML from the output buffer.
    return ob_get_clean();
});

add_shortcode('hello', function() {
	global $EM_Event;
    return $EM_Event->event_id;
});

add_filter('em_event_save', function( $result, $event ) {
    return $result;
}, 10, 2);

add_filter('em_event_output_placeholder', function( $replace, $event, $result ) {
    if ( preg_match( '/#_EVENTAVATAR.*/', $result ) ) {
        $replace = get_avatar( $event->get_contact()->ID, 200 );
    }
    return $replace;
}, 1, 3 );

// add_action('em_event_output_show_condition', 'my_em_new_event_output_show_condition', 1, 4);
function my_em_new_event_output_show_condition($show, $condition, $full_match, $EM_Event){
    if( "is_newpost" == $condition ){
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare("SELECT event_date_modified FROM ".EM_EVENTS_TABLE.' WHERE event_id=%s', $EM_Event->event_id));
        $event_date_modified = $row ? $row->event_date_modified : null;
        $postdate = get_post_datetime($EM_Event->post_id)->format('Y-m-d');
        $threedaysago = date('Y-m-d', strtotime('-3 days', current_time('timestamp')));
        $show = (strtotime($postdate) >= strtotime($threedaysago) || ($event_date_modified !== null && strtotime($event_date_modified) >= strtotime($threedaysago))) ? true : false;
    }
    return $show;
}
add_filter('em_event_output_placeholder', 'custom_eventurl_with_nocache', 10, 4);
function custom_eventurl_with_nocache($replace, $EM_Event, $placeholder, $target) {
    if ($placeholder === '#_EVENTURL') {
        $replace .= '?nocache';
    }
    return $replace;
}

/**
 * Custom Events Manager placeholder to display event description with HTML.
 *
 * This function prioritizes the event's custom excerpt. If no excerpt is set,
 * it uses the main event description, respecting the '<!--more-->' tag.
 * It also supports a flexible word limit and custom continuation string via
 * #_EVENTEXCERPT_HTML{words,continuation_string}, preserving all HTML.
 *
 * @param string $replace The string to replace the placeholder with.
 * @param object $EM_Event The EM_Event object.
 * @param string $result The original placeholder string (e.g., '#_EVENTEXCERPT_HTML{20,read more}').
 * @return string The processed event description with HTML.
 */
function custom_em_event_html_placeholder( $replace, $EM_Event, $result ) {
    // Define the base placeholder we are looking for.
    $base_placeholder = '#_EVENTEXCERPT_HTML';

    // Check if the current result matches our base placeholder,
    // optionally followed by {words,continuation_string}.
    if ( preg_match( '/^' . preg_quote( $base_placeholder, '/' ) . '(?:\{(\d+)(?:,(.*))?\})?$/', $result, $matches ) ) {

        $source_content = '';

        // 1. Prioritize EM_Event->post_excerpt if it exists and is not empty.
        if ( ! empty( $EM_Event->post_excerpt ) ) {
            $source_content = $EM_Event->post_excerpt;
        } else {
            // 2. If no excerpt, use post_content and check for <!--more--> tag.
            // get_extended() is a WordPress function that splits content by <!--more-->.
            $content_parts = get_extended( $EM_Event->post_content );
            $source_content = $content_parts['main']; // 'main' contains content before the more tag.
        }

        // Check if a word limit was specified (i.e., {words,...} part exists).
        if ( isset( $matches[1] ) ) {
            $word_limit = (int) $matches[1]; // Extract the number of words
            $continuation = '...'; // Default continuation string

            // Check if a custom continuation string was provided.
            if ( isset( $matches[2] ) && $matches[2] !== '' ) {
                $continuation = $matches[2];
            }

            // Apply word limit using the HTML-preserving function.
            if ( $word_limit > 0 ) {
                $replace = force_balance_tags( html_entity_decode( wp_trim_words( htmlentities( wpautop($source_content) ), $word_limit, $continuation ) ) );
            } else {
                // If word limit is 0 or invalid, return full content.
                $replace = $source_content;
            }
        } else {
            // If no {words,...} part, it means the placeholder was just #_EVENTEXCERPT_HTML.
            // Return the full determined content without any trimming.
            $replace = $source_content;
        }
    }

    return $replace;
}
add_filter( 'em_event_output_placeholder', 'custom_em_event_html_placeholder', 10, 3 );

add_filter( 'em_calendar_get_default_search', function( $atts ) {
    $atts['empty_months'] = true;
    return $atts;
} );

/**
 * Custom Functions for Events Manager Previous/Next Event Navigation
 * Designed to be used as Events Manager custom placeholders.
 */

/**
 * Helper function to get the next or previous event ID based on event_start.
 *
 * @param EM_Event $current_event The current EM_Event object.
 * @param bool     $previous      True for previous, false for next.
 * @return int|false Returns the adjacent event ID on success, false on failure.
 */
function my_pn_em_get_adjacent_event_id( $current_event, $previous = false ) {
    global $wpdb;

    if ( ! $current_event instanceof EM_Event ) {
        return false;
    }

    $current_event_datetime_string = $current_event->start()->format('Y-m-d H:i:s');
    $now_datetime_string = current_time('mysql');

    $query_operator = $previous ? '<' : '>';
    $order_direction = $previous ? 'DESC' : 'ASC';

    $sql = $wpdb->prepare(
        "SELECT event_id FROM " . EM_EVENTS_TABLE . "
        WHERE event_start {$query_operator} %s
        AND event_start >= %s
        AND event_status = 1
        ORDER BY event_start {$order_direction}, event_id {$order_direction}
        LIMIT 1",
        $current_event_datetime_string,
        $now_datetime_string
    );

    $adjacent_event_id = $wpdb->get_var( $sql );

    return $adjacent_event_id ? (int) $adjacent_event_id : false;
}

/**
 * Returns a string containing a link to the next future event.
 *
 * @param int|null $post_id The current post ID (optional, defaults to global $post).
 * @param string $label The text label for the link (default 'Next').
 * @param string $css_class Additional CSS class for the span.
 * @return string The HTML link string or empty string if no link.
 */
function my_pn_em_get_next_event_link_string( $post_id = null, $label = 'Next', $css_class = '' ) {
    if ( is_null($post_id) ) {
        global $post;
        $post_id = $post->ID;
    }

    if ( empty($post_id) ) {
        return '';
    }

    // Get the current EM_Event object by post_id
    $EM_Event = em_get_event( $post_id , 'post_id');
    if ( ! $EM_Event || $EM_Event->status !== 1 ) {
        return '';
    }

    $next_event_id = my_pn_em_get_adjacent_event_id( $EM_Event, false );

    if ( $next_event_id ) {
        $next_event = em_get_event( $next_event_id );
        if ( $next_event && $next_event->status === 1 ) {
            $class_attr = $css_class ? ' class="em-next-event ' . esc_attr($css_class) . '"' : ' class="em-next-event"';
            return '<span' . $class_attr . '><a href="' . esc_url($next_event->get_permalink()) . '">' . esc_html($label) . ' &raquo;</a></span>';
        }
    }
    return '';
}

/**
 * Returns a string containing a link to the previous future event.
 *
 * @param int|null $post_id The current post ID (optional, defaults to global $post).
 * @param string $label The text label for the link (default 'Previous').
 * @param string $css_class Additional CSS class for the span.
 * @return string The HTML link string or empty string if no link.
 */
function my_pn_em_get_previous_event_link_string( $post_id = null, $label = 'Previous', $css_class = '' ) {
    if ( is_null($post_id) ) {
        global $post;
        $post_id = $post->ID;
    }

    if ( empty($post_id) ) {
        return '';
    }

    // Get the current EM_Event object by post_id
    $EM_Event = em_get_event( $post_id , 'post_id');
    if ( ! $EM_Event || $EM_Event->status !== 1 ) {
        return '';
    }

    $previous_event_id = my_pn_em_get_adjacent_event_id( $EM_Event, true );

    if ( $previous_event_id ) {
        $prev_event = em_get_event( $previous_event_id );
        if ( $prev_event && $prev_event->status === 1 ) {
            $class_attr = $css_class ? ' class="em-prev-event ' . esc_attr($css_class) . '"' : ' class="em-prev-event"';
            return '<span' . $class_attr . '>&laquo; <a href="' . esc_url($prev_event->get_permalink()) . '">' . esc_html($label) . '</a></span>';
        }
    }
    return '';
}

/**
 * Returns a string containing both previous and next event links with an optional separator.
 *
 * @param int|null $post_id The current post ID (optional, defaults to global $post).
 * @param string $prev_label The label for the previous link.
 * @param string $next_label The label for the next link.
 * @param string $separator The separator string to place between links.
 * @param string $container_css_class Additional CSS class for the wrapping span.
 * @return string The combined HTML links string or empty string.
 */
function my_pn_em_get_previous_next_events_links_string( $post_id = null, $prev_label = 'Previous', $next_label = 'Next', $separator = ' | ', $container_css_class = 'em-nav-links' ) {
    if ( is_null($post_id) ) {
        global $post;
        $post_id = $post->ID;
    }

    if ( empty($post_id) ) {
        return '';
    }

    $prev_link = my_pn_em_get_previous_event_link_string( $post_id, $prev_label );
    $next_link = my_pn_em_get_next_event_link_string( $post_id, $next_label );

    if ( $prev_link || $next_link ) {
        $output = '<span class="' . esc_attr($container_css_class) . '">';
        if ( $prev_link ) {
            $output .= $prev_link;
        }
        if ( $prev_link && $next_link ) {
            $output .= esc_html($separator);
        }
        if ( $next_link ) {
            $output .= $next_link;
        }
        $output .= '</span>';
        return $output;
    }
    return '';
}

/**
 * Filters Events Manager output to add custom previous/next event links.
 *
 * @param string   $replace   The string to replace the placeholder with.
 * @param EM_Event $EM_Event  The current EM_Event object.
 * @param string   $result    The original placeholder string matched.
 * @return string The replacement string.
 */
function my_pn_em_custom_event_placeholders( $replace, $EM_Event, $result ) {
    // Ensure we have a valid EM_Event and post_id to work with
    if ( ! $EM_Event instanceof EM_Event || empty($EM_Event->post_id) ) {
        return $replace;
    }

    switch ( $result ) {
        case '#_PREVIOUSEVENT':
            $replace = my_pn_em_get_previous_event_link_string( $EM_Event->post_id );
            break;
        case '#_NEXTEVENT':
            $replace = my_pn_em_get_next_event_link_string( $EM_Event->post_id );
            break;
        case '#_PREVIOUSNEXTEVENTS':
            $replace = my_pn_em_get_previous_next_events_links_string( $EM_Event->post_id );
            break;
    }

    return $replace;
}
add_filter('em_event_output_placeholder', 'my_pn_em_custom_event_placeholders', 10, 3);

function pn_em_plugin_enqueue_styles() {
    wp_enqueue_style(
            'prev-next-event-em-style', // Unique handle for your stylesheet
            plugins_url( 'styles.css', __FILE__ ), // Path to your stylesheet
            array(), // Dependencies (e.g., other stylesheets it relies on)
            '1.0.29', // Version number (optional, good for cache busting)
            'all' // Media type (e.g., 'all', 'screen', 'print')
    );
}

add_action( 'wp_enqueue_scripts', 'pn_em_plugin_enqueue_styles' );

add_filter('em_booking_validate', function($result, $EM_Booking) {
    if (!is_user_logged_in() && $_REQUEST['dbem_phone'] == ''){
        $EM_Booking->add_error('Your Contact Number is Required...');
        $result = false;
    }
    return $result;
}, 1, 2); 

function my_em_validate_anonymous_event_submission($result, $EM_Event) {
    // Only apply validation if the user is not logged in (anonymous submission)
    if (!is_user_logged_in()) {
		// error_log("control:" . $_REQUEST['control'] . "eol");
        if( !empty($_REQUEST['control'])){
             $result = false;
        }
    }
    return $result;
}
add_filter('em_event_validate', 'my_em_validate_anonymous_event_submission', 10, 2);

function my_control_html( $EM_Event ) {
    if (!is_user_logged_in()) {
    ?>
    <p>
    <input type="text" name="control" id="control" class="input" value="" style="display:none; visibility:hidden;"/>
    </p>
    <?php
    }
}
add_action('em_front_event_form_footer', 'my_control_html', 8, 1);

add_filter('em_events_output_args', function( $args ) {
	$args['ajax'] = 0;
    return $args;
});
add_filter('em_object_build_sql_conditions_args', function($args) {
	if ($args['scope'] == 'all' && array_key_exists('scope', $_REQUEST) && $_REQUEST['scope'] != 'all') {
		$args['scope'] = $_REQUEST['scope'];
	}
	// error_log("em_obj_bld_sql_cond_args:" . print_r($args, true));
	return $args;
});
add_filter('em_object_build_sql_conditions', function($conditions) {
    // $e = new Exception("in em_object_build_sql_conditions filter");
    // error_log("sql_cond:" . $e->getTraceAsString());
	// error_log("conditions:" . print_r($conditions, true) );
	return $conditions;
});
add_filter('em_events_get_sql', function($sql, $args) {
	// error_log("sql:" . print_r($sql, true));
	if ($args['scope'] == 'all' && array_key_exists('scope', $_REQUEST) && $_REQUEST['scope'] != 'all') {
		$args['scope'] = $_REQUEST['scope'];
	}
	// error_log("_REQUEST[scope]:" . $_REQUEST['scope']);
	// error_log("args[scope]:" . $args['scope']);
    // $e = new Exception("in em_events_get_sql filter");
    // error_log("ev_get_sql:" . $e->getTraceAsString());
	return $sql;
}, 10, 2);
add_filter('em_calendar_template_args', function($args) {
    if ( !empty($_GET['category']) ) {
        $args['category'] = sanitize_text_field($_GET['category']);
    }
    return $args;
});

add_action( 'parse_query', function ( $query ) {
    // Check if we are on the admin side, for the 'event' post type, and it's the main query
    if ( is_admin() && $query->get('post_type') === 'event' && $query->is_main_query() ) {
        // Check if a scope is not already set in the URL
        if ( ! isset( $_REQUEST['scope'] ) ) {
            // Set the default scope to 'all'
            // $query->set( 'scope', 'all' );
			$_REQUEST['scope'] = "all";
        }
    }
}, 9 );

add_filter('em_events_get_sql', function($sql, $args) {
	//  error_log(print_r($sql, true));
	return $sql;
}, 10, 2);

function my_custom_header_script() {
    ?>
	<script src="https://kit.fontawesome.com/a57cf2eab5.js" crossorigin="anonymous"></script>
    <?php
}
add_action( 'wp_head', 'my_custom_header_script' );

function bk_gutenberg_categories_fix($args) {
// FIX MISSING CATEGORIES AND TAGS in Event Manager edit mode. 
    $args['show_in_rest'] = true;
    return $args;
}

add_filter('em_cpt_categories','bk_gutenberg_categories_fix');
add_filter('em_cpt_tags','bk_gutenberg_categories_fix');

// function mysnippets_enqueue_scripts($hook_suffix = '') {
	// wp_enqueue_script('mysnippets', plugins_url('js/mysnippets.js', __FILE__), array(), '1.0.0');
// }
// add_action('admin_enqueue_scripts', 'mysnippets_enqueue_scripts');
