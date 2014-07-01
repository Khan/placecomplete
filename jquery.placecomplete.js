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

if (typeof require === "function") {
    require("select2");
}

var pluginName = "placecomplete";
var defaults = {
    placeholderText: "City, State, Country",
    // Request parameters for the .getPlacePredictions() call
    // See https://developers.google.com/maps/
    // documentation/javascript/reference#AutocompletionRequest
    // for more details
    requestParams: {
        types: ["(cities)"]
    }
};

window.initPlacecomplete = function() {
    GooglePlacesAPI.completeInit();
};

/**
 * A wrapper to simplify communicating with and contain logic specific to the
 * Google Places API
 *
 * @return {object} An object with public methods getPredictions() and
 *                  getDetails()
 */
var GooglePlacesAPI = {

    deferred: new $.Deferred(),
    initialized: false,
    acService: null,
    pService: null,
    el: null,

    /**
     * Start loading Google Places API if it hasn't yet been loaded.
     *
     * @param  {HTMLDivElement} el
     *
     *     Container in which to "render attributions", according to
     *     https://developers.google.com/maps/documentation/javascript/reference#PlacesService.
     *     TODO(stephanie): I still don't really understand why the element is
     *     necessary, hence why I'm only ever instantiating PlacesService
     *     once, no matter how many elements are initialized with the plugin.
     */
    init: function(el) {
        // Ensure init() is idempotent, just in case.
        if (this.initialized) {
            return;
        }

        // Store element so we can use it to intialize PlacesService in
        // completeInit()
        this.el = el;

        // Only fetch Google Maps API if it's not already loaded
        if (window.google && google.maps && google.maps.places) {
            // Skip to completeInit() directly
            this.completeInit();
        } else {
            $.ajax({
                url: "https://maps.googleapis.com/maps/api/js?libraries=places&sensor=false&callback=initPlacecomplete",
                dataType: "script",
                cache: true
            });
        }
    },

    completeInit: function() {
        // AutocompleteService is needed for getting the list of options
        this.acService = new google.maps.places.AutocompleteService();

        // PlacesService is needed for getting details for the selected
        // option
        this.pService = new google.maps.places.PlacesService(this.el);

        this.initialized = true;
        this.deferred.resolve();
    },

    _handlePredictions: function(def, abbreviatedPlaceResults, status) {
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
            def.reject(status);
            return;
        }
        def.resolve(abbreviatedPlaceResults);
    },

    _handleDetails: function(def, displayText, placeResult, status) {
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
            def.reject(status);
            return;
        }
        placeResult["display_text"] = displayText;
        def.resolve(placeResult);
    },

    // Get list of autocomplete results for the provided search term
    getPredictions: function(searchTerm, requestParams) {
        return this.deferred.then($.proxy(function() {
            var deferred = new $.Deferred();
            requestParams = $.extend({}, requestParams, {
                "input": searchTerm
            });
            this.acService.getPlacePredictions(
                requestParams,
                $.proxy(this._handlePredictions, null, deferred));
            return deferred.promise();
        }, this));
    },

    // Get details of the selected item
    getDetails: function(abbreviatedPlaceResult) {
        return this.deferred.then($.proxy(function() {
            var deferred = new $.Deferred();
            var displayText = abbreviatedPlaceResult.description;
            this.pService.getDetails({
                reference: abbreviatedPlaceResult.reference
            }, $.proxy(this._handleDetails, null, deferred, displayText));
            return deferred.promise();
        }, this));
    }
};

var Plugin = function(element, options) {
    this.element = element;

    // Initialize
    GooglePlacesAPI.init(element);

    this.options = $.extend({}, defaults, options);

    this._defaults = defaults;
    this._name = pluginName;

    this.init();
};

Plugin.prototype.init = function() {
    var $el = $(this.element);

    var requestParams = this.options.requestParams;

    var select2options = $.extend({}, {
        query: function(query) {
            GooglePlacesAPI.getPredictions(query.term, requestParams)
                .done(function(aprs) {
                    var results = $.map(aprs, function(apr) {
                        // Select2 needs a "text" and "id" property set
                        // for each autocomplete list item. "id" is
                        // already defined on the apr object
                        apr["text"] = apr["description"];
                        return apr;
                    });
                    query.callback({results: results});
                })
                .fail(function(errorMsg) {
                    $el.trigger(pluginName + ":error", errorMsg);
                    query.callback({results: []});
                });
        },
        initSelection: function(element, callback) {
            // initSelection() was triggered by value being defined directly
            // in the input element HTML
            var initText = $el.val();

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
            GooglePlacesAPI.getDetails(evt.added)
                .done(function(placeResult) {
                    $el.trigger(pluginName + ":selected", placeResult);
                })
                .fail(function(errorMsg) {
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
