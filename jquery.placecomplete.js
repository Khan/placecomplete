// Use AMD or browser globals to create a jQuery plugin
// From: https://github.com/umdjs/umd/blob/master/jqueryPlugin.js
;(function(factory) {
    if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module
        define(["jquery"], factory);
    } else {
        // browser globals
        factory(jQuery);
    }
})(function($) {

/**
 * A wrapper to simplify communicating with and contain logic specific to the
 * Google Places API
 *
 * @param  {HTMLDivElement} el
 *
 *         Container in which to "render attributions", according to
 *         https://developers.google.com/maps/
 *         documentation/javascript/reference#PlacesService.
 *
 *         TODO(stephanie): I still don't really understand why the element
 *         is necessary, hence why I'm only ever instantiating PlacesService
 *         once, no matter how many elements are initialized with the plugin.
 *
 * @return {object} An object with public methods getPredictions() and
 *                  getDetails()
 */
var GooglePlacesAPI = function(el) {

    // AutocompleteService is needed for getting the list of options
    var acService = new google.maps.places.AutocompleteService();

    // PlacesService is needed for getting details for the selected
    // option
    var pService = new google.maps.places.PlacesService(el);

    var handlePredictions = function(def, abbreviatedPlaceResults, status) {
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
            def.reject(status);
            return;
        }
        def.resolve(abbreviatedPlaceResults);
    };

    var handleDetails = function(def, displayText, placeResult, status) {
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
            def.reject(status);
            return;
        }
        placeResult["display_text"] = displayText;
        def.resolve(placeResult);
    };

    return {
        // Get list of autocomplete results for the provided search term
        getPredictions: function(searchTerm, requestParams) {
            var deferred = new $.Deferred();
            requestParams = $.extend({}, requestParams, {"input": searchTerm});
            acService.getPlacePredictions(
                requestParams, $.proxy(handlePredictions, this, deferred));
            return deferred.promise();
        },

        // Get details of the selected item
        getDetails: function(abbreviatedPlaceResult) {
            var deferred = new $.Deferred();
            var displayText = abbreviatedPlaceResult.description;
            pService.getDetails(
                {reference: abbreviatedPlaceResult.reference},
                $.proxy(handleDetails, this, deferred, displayText));
            return deferred.promise();
        }
    };
};

var pluginName = "placecomplete",
    GPAPI,
    defaults = {
        placeholderText: "City, State, Country",
        initText: "",
        // Request parameters for the .getPlacePredictions() call
        // See https://developers.google.com/maps/
        // documentation/javascript/reference#AutocompletionRequest
        // for more details
        requestParams: {
            types: ["(cities)"]
        }
    };

function Plugin(element, options) {
    this.element = element;

    if (!GPAPI) {
        GPAPI = new GooglePlacesAPI(this.element);
    }

    this.options = $.extend({}, defaults, options);

    this._defaults = defaults;
    this._name = pluginName;

    this.init();
}

Plugin.prototype.init = function() {
    var $el = $(this.element);

    var requestParams = this.options.requestParams;
    var initText = this.options.initText;

    // If an initText value is supplied, set the `value` property on the
    // input HTML element to trigger select2 to call initSelection()
    if (initText.length > 0) {
        $el.val(initText);
    }

    var select2options = $.extend({}, {
        query: function(query) {
            $.when(GPAPI.getPredictions(query.term, requestParams))
             .then(function(aprs) {
                    var results = $.map(aprs, function(apr) {
                        // Select2 needs a "text" and "id" property set for
                        // each autocomplete list item. "id" is already
                        // defined on the apr object
                        apr["text"] = apr["description"];
                        return apr;
                    });
                    query.callback({results: results});
             }, function(errorMsg) {
                    $el.trigger(pluginName + ":error", errorMsg);
                    query.callback({results: []});
             });
        },
        initSelection: function(element, callback) {
            // initSelection() was triggered by value being defined directly
            // in the input element HTML
            if (!initText) {
                var initText = $el.val();
            }
            // The id doesn't matter here since we're just trying to prefill
            // the input with text for the user to see.
            callback({id: 0, text: initText});
        },
        minimumInputLength: 1,
        selectOnBlur: true,
        allowClear: true,
        multiple: false,
        dropdownCssClass: "jquery-placecomplete-google-attribution",
        placeholder: this.options.placeholderText
    }, this.options);

    $el.select2(select2options);

    $el.on({
        "select2-removed": function(evt) {
            $el.trigger(pluginName + ":cleared");
        },
        "change": function(evt) {
            if (!evt.added) {
                return;
            }
            $.when(GPAPI.getDetails(evt.added)).then(function(placeResult) {
                $el.trigger(pluginName + ":selected", placeResult);
            }, function(errorMsg) {
                $el.trigger(pluginName + ":error", errorMsg);
            });
        }
    });
};

$.fn[pluginName] = function(options) {
    return this.each(function() {
        if (!$.data(this, "plugin_" + pluginName)) {
            $.data(this, "plugin_" + pluginName,
                   new Plugin(this, options));
        }
    });
};

});
