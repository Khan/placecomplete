# Placecomplete: A jQuery plugin for location autocomplete

## Justification/Use Cases

(TODO: summarize how existing solutions aren't adequate.)

## Dependencies

Make sure to load the following libraries (and associated stylesheets and assets) before using Placecomplete:

1. [jQuery](http://jquery.com/)
2. [Select2](http://ivaynberg.github.io/select2/)
3. [Google Maps Places API](https://developers.google.com/places/documentation/autocomplete)

The following code is sufficient for including the Google Maps API:

	<script type="text/javascript"
          src="https://maps.googleapis.com/maps/api/js?libraries=places&amp;sensor=false"></script>

## Usage

### HTML
	<input id="location-picker" type="text" />

### Javascript

#### Simple configuration and default values

 	$("#location-picker").placecomplete({});

is equivalent to this:

	$("#location-picker").placecomplete({
        placeholderText: "City, State, Country",
        requestParams: {
            types: ["(cities)"]
        }
    });

See the next section for more details on the format of `requestParams`.

#### Different request parameters for the Google Places API call

The `requestParams` object takes the format of the [Google Maps API AutocompletionRequest object](https://developers.google.com/maps/documentation/javascript/reference#AutocompletionRequest).

Note that `input` will always be set by the plugin to the user's text input.

	$("#location-picker").placecomplete({
		placeholderText: "Business name",
		requestParams: {
            types: ["establishment"]
        }
    );

#### Select2 options

Because Placecomplete instantiates Select2 on your element, you can supply [Select2 options](http://ivaynberg.github.io/select2/#documentation) directly:

	$("#location-picker").placecomplete({
		width: "element",
		placeholderText: "Enter your location here"
	});

## API

Placecomplete triggers three events:

### `placecomplete:selected`
When the user selects an item from the autocomplete

	$el.on({
		"placecomplete:selected": function(evt, placeResult) {
			$feedbackEl.text(JSON.stringify(placeResult));
		}
	});

### `placecomplete:cleared`
When the user clears the input via the clear button

	$el.on({
		"placecomplete:cleared": function(evt) {
			$feedbackEl.text("Input cleared!");
		}
	});

### `placecomplete:error`
When the Google Maps API returns an error

	$el.on({
		"placecomplete:error": function(evt, errorMsg) {
			$feedbackEl.text("Error: " + errorMsg);
		}
	})