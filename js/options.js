/*
  The code behind the options HTML page. Manages manipulating the pages list as
  well as editing global and per-page settings.
*/
// The minimum length of time in minutes that a time textbox is allowed to have.

var MIN_TIME_TEXTBOX_VALUE = 0.8; //aproximatively 5 sec


// Returns a boolean indicating whether the supplied string is a valid selector.
function isValidSelector(selector) {
    if (selector == '#') {
        return false;
    }
    try {
        $(selector);
    } catch (e) {
        return false;
    }
    return true;
}

// Fades the background (elements with z-index < 1) to gray and back, depending
// on whether the "show" argument evaluates to boolean true or false.
function shadeBackground(show) {
    var dark = $('#shader');
    if (dark.length == 0) dark = $('<div id="shader" />').appendTo('body');
    dark.height($('body').get(0).scrollHeight);

    if (show) {
        dark.css('display', 'block').animate({ opacity: 0.7 });
    } else {
        dark.animate({ opacity: 0 }, function() {
            dark.css('display', 'none');
        });
    }
}

// Returns the URL of the page record given any element in it.
function findUrl(context) {
    return $(context).closest('.page_record').find('.page_link').get(0).href;
}

// Returns a jQuery-wrapped page_record element which contains the specified
// context element of a link to the specified URL.
function findPageRecord(url_or_context) {
    if (typeof(url_or_context) == 'string') {
        url_or_context = '.page_link[href="' + url_or_context + '"]';
    }
    return $(url_or_context).closest('.page_record');
}

// Returns 2 to the power of the given value. Used when converting the value of
// the check interval sliders which use a logarithmic scale. The returned value
// is rounded to 2 decimal places if they are below 1. It is rounded to 1
// decimal place for values between 1 and 10. It is rounded to an integer for
// values above 10.
function timeLogToAbsolute(log) {
    var val = Math.pow(1.5, log);
    if (val < 1) {
        return Math.round(val * 100) / 100;
    } else if (val < 10) {
        return Math.round(val * 10) / 10;
    } else {
        return Math.round(val);
    }
}

// Returns the logarithm of 2 for the given value. Used when setting the check
// interval sliders which use a logarithmic scale.
function timeAbsoluteToLog(absolute) {
    return Math.log(absolute) / Math.log(1.5);
}

// Enables or disables the Test button and the regex/selector textbox for a
// particular page record depending on whether the enable argument is non-false.
function updatePageModeControls(page_record, enable) {
    page_record.find('.mode .mode_string').toggleClass('invalid', !enable);
    page_record.find('.mode .mode_test').attr({ disabled: !enable });
}

// Applies a per-page check interval to a page given its URL. The interval
// should be a number in minutes or a null to disable custom interval for this
// page. After the new value is applied, scheduleCheck() is called on the
// background page.
function setPageCheckInterval(url, minutes) {
    var interval = (parseFloat(minutes) * 60 * 1000) || null;
    setPageSettings(url, { check_interval: interval }, BG.scheduleCheck);
}


//Import& export functions

function exportPagesList(callback) {
    if (!callback) return;

    getAllPages(function(pages) {
        var buffer = [];
        var add_date = Date.now();

        buffer.push('<!DOCTYPE NETSCAPE-Bookmark-file-1>\n\n<!-- This is an' +
            ' automatically generated file.\n     It will be read and' +
            ' overwritten.\n     DO NOT EDIT! -->\n<META HTTP-EQUIV=' +
            '"Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>' +
            'Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n');

        for (var i in pages) {
            buffer.push('        <DT><A HREF="' + pages[i].url + '" ADD_DATE="' +
                add_date + '">' + pages[i].name + '</A>\n');

            var encoded_settings = JSON.stringify({
                mode: pages[i].mode,
                regex: pages[i].regex,
                selector: pages[i].selector,
                check_interval: pages[i].check_interval,
                crc: pages[i].crc,
                last_check: pages[i].last_check,
                last_changed: pages[i].last_changed
            }).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            buffer.push('            <!--PageMonitorAdvancedPageData=' +
                encoded_settings + '-->\n');
        }

        buffer.push('</DL><p>');

        callback(buffer.join(''));
    });
}

// Takes the contents of a netscape bookmarks file and imports all the pages in
// it for monitoring. IF any of the pages contain Page Monitor-specific settings
// as written out by exportPagesList(), these are imported as well. Returns the
// number of pages found.
function importPagesList(bookmarks) {
    var page_regex = new RegExp('(<[aA][^<>]+>[^<>]+<\/[aA]>)(?:\\s*<!--' +
        'PageMonitorAdvancedPageData=' +
        '(\{.*?\})-->)?', 'g');
    var match;
    var matches_count = 0;

    while (match = page_regex.exec(bookmarks, page_regex.lastIndex)) {
        var link = $(match[1]);
        var url = link.attr('HREF') || '';
        var name = link.text() || chrome.i18n.getMessage('untitled', url);

        var advanced = {};
        if (match[2]) {
            advanced = JSON.parse(match[2].replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>'));
        }

        if (url) {
            addPage($.extend({ url: url, name: name }, advanced));
            matches_count++;
        }
    }

    return matches_count;
}

//Global Controls Initialization

// Initializes the global controls with saved values and event handlers.
function initializeGlobalControls() {
    initializeColorPicker();
    initializeAnimationToggler();
    initializeSorter();
    initializeIntervalSliders();
    initializeNotificationsToggler();
    initializeNotificationsTimeout();
    initializeSoundSelector();
    initializeSoundPlayer();
    initializeSoundCreator();
    initializeViewAllSelector();
    initializeHideDeletionsToggler();
    initializeShowFullPageDiff();
    initializeExporter();
    initializeImporter();
    initializeGlobalChecker();
    initializeAdvancedSwitch();
}

// Initializes the color picker input.Fills it with the color from
// SETTINGS.badge_color and applies the jQuery colorPicker plugin function on
// it.

function initializeColorPicker() {
    var toHex = function(d) {
        return d >= 16 ? d.toString(16) : '0' + d.toString(16);
    };

    var badge_color = getSetting(SETTINGS.badge_color) || [0, 180, 0, 255];
    var badge_color = '#' + toHex(badge_color[0]) +
        toHex(badge_color[1]) +
        toHex(badge_color[2]);

    $('#badge_color input').val(badge_color).change(function() {
        var color = $(this).val();

        setSetting(SETTINGS.badge_color, [parseInt(color.slice(1,3), 16),
            parseInt(color.slice(3,5), 16),
            parseInt(color.slice(5,7), 16),
            255]);
        BG.updateBadge();
    }).colorPicker();
}

// Initializes the animation toggler drop-down.

function initializeAnimationToggler() {
    $('#animation select').change(function() {
        var disabled = ($(this).val() != 'enabled');
        setSetting(SETTINGS.animations_disabled, disabled);
        $.fx.off = disabled;
    }).val(getSetting(SETTINGS.animations_disabled) ? 'disabled' : 'enabled');
}

// Initializes the sorter drop-down.
function initializeSorter() {
    $('#sort select').change(function() {
        setSetting(SETTINGS.sort_by, $(this).val());
        fillPagesList();
    }).val(getSetting(SETTINGS.sort_by) || 'date added');
}

// Initializes the two check interval sliders

function initializeIntervalSliders() {
    var interval_ms = getSetting(SETTINGS.check_interval) || (180 * 60 * 1000);
    var interval_min = interval_ms / (60 * 1000);
    var slider = $('#basic_interval input[type=range]');
    var slider_label = $('#basic_interval .range_value_label');
    var textbox = $('#interval input');
    var textbox_label = $('#interval .check_every_label');

    textbox.val(interval_min).change(function() {
        var val_ms = parseFloat($(this).val()) * 60 * 1000;
        if (val_ms < 5000) val_ms = 5000;
        if (val_ms > 199500000) val_ms = 199500000;
        var val_min = val_ms / (60 * 1000);
        textbox.val(val_min);
        slider.val(timeAbsoluteToLog(val_min)).change();
        var message;
        if (val_min == 1) {
            message = chrome.i18n.getMessage('minute');
        } else {
            message = chrome.i18n.getMessage('minutes', '2');
        }
        textbox_label.text(message.split(' ')[1]);

        setSetting(SETTINGS.check_interval, val_ms);
    }).change();

    slider.val(timeAbsoluteToLog(interval_min)).change(function() {
        var val_ms = timeLogToAbsolute(parseFloat($(this).val())) * 60 * 1000;
        slider.siblings('.range_value_label').text(describeTime(val_ms));
    }).mouseup(function() {
        var val_min = timeLogToAbsolute(parseFloat($(this).val()));
        var val_ms = val_min * 60 * 1000;
        textbox.val(val_min);
        setSetting(SETTINGS.check_interval, val_ms);
    }).mouseup().change();

    var position = slider.offset();
    var width = slider.width();
    var height = slider.height();
    var label_width = slider_label.width();
    var label_height = slider_label.height();

    var new_left = position.left + width / 2 - label_width / 2;
    slider_label.css({ left: new_left });
}

