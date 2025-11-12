<?php 
/* 
 * This file generates a tabular list of tickets for the event booking forms with input values for choosing ticket spaces.
 * If you want to add to this form this, you'd be better off hooking into the actions below.
 */
/* @var $EM_Event EM_Event */
global $allowedposttags;
$EM_Tickets = $EM_Event->get_bookings()->get_tickets(); //already instantiated, so should be a quick retrieval.
/*
 * This variable can be overridden, by hooking into the em_booking_form_tickets_cols filter and adding your collumns into this array.
 * Then, you should create a em_booking_form_tickets_col_arraykey action for your collumn data, which will pass a ticket and event object.
 */
$collumns = $EM_Tickets->get_ticket_collumns(); //array of collumn type => title
?>
<div class="table-grid">
	<?php foreach( $EM_Tickets->tickets as $EM_Ticket ): /* @var $EM_Ticket EM_Ticket */ ?>
		<div class="data-row">
		<?php if( $EM_Ticket->is_displayable() ): ?>
		<?php do_action('em_booking_form_tickets_loop_header', $EM_Ticket); //do not delete ?>
				<?php foreach( $collumns as $type => $name ): ?>
					<?php
					//output collumn by type, or call a custom action
					switch($type){
						case 'type':
							?>
							<div class="cell header"><?php echo wp_kses_data($EM_Ticket->ticket_name); ?><?php if(!empty($EM_Ticket->ticket_description)) :?><br><span class="ticket-desc"><?php echo wp_kses($EM_Ticket->ticket_description,$allowedposttags); ?></span><?php endif; ?></div>
							<?php
							break;
						case 'price':
							?>
							<div class="cell-group">
								<span class="event-price"><?php echo $EM_Ticket->get_price(true); ?></span>
							<?php
							break;
						case 'spaces':
							?>
								<?php
									$default = !empty($_REQUEST['em_tickets'][$EM_Ticket->ticket_id]['spaces']) ? $_REQUEST['em_tickets'][$EM_Ticket->ticket_id]['spaces']:0;
									$spaces_options = $EM_Ticket->get_spaces_options(true,$default);
									?>
									<span class="event-spaces">
									<?php
									echo ( $spaces_options ) ? $spaces_options:"<strong>".__('N/A','events-manager')."</strong>";
								?>
								</span>
							</div>
							<?php
							break;
					}
					?>
				<?php endforeach; ?>
			<?php do_action('em_booking_form_tickets_loop_footer', $EM_Ticket); //do not delete ?>
		<?php endif; ?>
		</div>
	<?php endforeach; ?>
</div>
