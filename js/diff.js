/*
  Contains a suite of functions used by diff.htm to create a page displaying the
  diff between two versions of an HTML or text page. The whole operation can be
  performed from start to finish by calling initiateDiff(url) and having a
  snapshot of the page at that URL available from getPage(), defined in base.js.
*/

//Constants
// The number of pixels to leave before the first change when scrolling to it.
var SCROLL_MARGIN = 75;

// The maximum length of matching text between "insert"/"delete" runs in an HTML
// diff that should be merged into the surrounding runs.
var SHORT_TEXT_LENGTH = 15;

// The start and end tag for sequences of insertions or deletions.
var INS_START = '<ins class="chrome_page_monitor_ins">';
var INS_END = '</ins>';
var DEL_START = '<del class="chrome_page_monitor_del">';
var DEL_END = '</del>';

//HTML Diffing

function getSimilarity(str1, str2) {
    return (new difflib.SequenceMatcher(str1.split(''), str2.split(''))).ratio();
}

// Splits an HTML string into tokens for diffing. First the HTML is split into nodes, then text nodes are further split into words, runs of punctuation and runs of whitespace. Comment nodes are discarded.
function tokenizeHtml(str) {
    var parts = [];
    $('<html/>').append(str).contents().each(function() {
        if (this.nodeType == Node.TEXT_NODE) {
            parts = parts.concat(this.data.match(/\s+|\w+|\W+/g));
        } else if (this.nodeType == Node.ELEMENT_NODE) {
            parts.push(this.outerHTML);
        }
    });
    return parts;
}

function hashToken(token, loose_compare) {
    if (/^</.test(token)) {
        // For HTML tag tokens, compare only the actual text content in loose mode.
        return crc(loose_compare ? cleanHtmlPage(token) : token);
    } else {
        return token;
    }
}

// Determines whether any token in a hashed tokens list is an HTML tag. Assumes
// that text tokens are unhashed.
function hasTags(hashed_tokens) {
    for (var i = 0; i < hashed_tokens.length; i++) {
        if (typeof(hashed_tokens[i]) == 'number') return true;
    }
    return false;
}

// A shortcut to iterate diff opcode lists.
function eachOpcode(opcodes, callback) {
    for (var i = 0; i < opcodes.length; i++) {
        var opcode = opcodes[i];
        callback(opcode, opcode[1], opcode[2], opcode[3], opcode[4]);
    }
}
