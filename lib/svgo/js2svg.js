'use strict';

var EXTEND = require('whet.extend'),
    textElem = require('../../plugins/_collections.js').elemsGroups.textContent.concat('title'),
    textChildElem = require('../../plugins/_collections.js').elemsGroups.textContentChild;

var defaults = {
    doctypeStart: '<!DOCTYPE',
    doctypeEnd: '>',
    procInstStart: '<?',
    procInstEnd: '?>',
    tagOpenStart: '<',
    tagOpenEnd: '>',
    tagCloseStart: '</',
    tagCloseEnd: '>',
    tagShortStart: '<',
    tagShortEnd: '/>',
    attrStart: '="',
    attrEnd: '"',
    commentStart: '<!--',
    commentEnd: '-->',
    cdataStart: '<![CDATA[',
    cdataEnd: ']]>',
    textStart: '',
    textEnd: '',
    indent: '    ',
    regEntities: /[&'"<>]/g,
    regValEntities: /[&"<>]/g,
    encodeEntity: encodeEntity,
    pretty: false
};

var entities = {
      '&': '&amp;',
      '\'': '&apos;',
      '"': '&quot;',
      '>': '&gt;',
      '<': '&lt;',
    };

/**
 * Convert SVG-as-JS object to SVG (XML) string.
 *
 * @param {Object} data input data
 * @param {Object} config config
 *
 * @return {Object} output data
 */
module.exports = function(data, config) {

    return new JS2SVG(config).convert(data);

};

function JS2SVG(config) {

    if (config) {
        this.config = EXTEND(true, {}, defaults, config);
    } else {
        this.config = defaults;
    }

    if (this.config.pretty) {
        this.config.doctypeEnd += '\n';
        this.config.procInstEnd += '\n';
        this.config.commentEnd += '\n';
        this.config.cdataEnd += '\n';
        this.config.tagShortEnd += '\n';
        this.config.tagOpenEnd += '\n';
        this.config.tagCloseEnd += '\n';
    }

    this.indentLevel = 0;

}

function encodeEntity(char) {
    return entities[char];
}

/**
 * Start conversion.
 *
 * @param {Object} data input data
 *
 * @return {String}
 */
JS2SVG.prototype.convert = function(data) {

    var svg = '';

    if (data.content) {

        this.indentLevel++;

        data.content.forEach(function(item) {

            if (item.elem) {
               svg += this.createElem(item);
            } else if (item.text) {
               svg += this.createText(item.text);
            } else if (item.doctype) {
                svg += this.createDoctype(item.doctype);
            } else if (item.processinginstruction) {
                svg += this.createProcInst(item.processinginstruction);
            } else if (item.comment) {
                svg += this.createComment(item.comment);
            } else if (item.cdata) {
                svg += this.createCDATA(item.cdata);
            }

        }, this);

    }

    this.indentLevel--;

    return {
        data: svg,
        info: {
            width: this.width,
            height: this.height
        }
    };

};

/**
 * Create indent string in accordance with the current node level.
 *
 * @return {String}
 */
JS2SVG.prototype.createIndent = function() {

    var indent = '';

    if (this.config.pretty) {
        for (var i = 1; i < this.indentLevel; i++) {
            indent += this.config.indent;
        }
    }

    return indent;

};

/**
 * Create doctype tag.
 *
 * @param {String} doctype doctype body string
 *
 * @return {String}
 */
JS2SVG.prototype.createDoctype = function(doctype) {

    return  this.config.doctypeStart +
            doctype +
            this.config.doctypeEnd;

};

/**
 * Create XML Processing Instruction tag.
 *
 * @param {Object} instruction instruction object
 *
 * @return {String}
 */
JS2SVG.prototype.createProcInst = function(instruction) {

    return  this.config.procInstStart +
            instruction.name +
            ' ' +
            instruction.body +
            this.config.procInstEnd;

};

/**
 * Create comment tag.
 *
 * @param {String} comment comment body
 *
 * @return {String}
 */
JS2SVG.prototype.createComment = function(comment) {

    return  this.config.commentStart +
            comment +
            this.config.commentEnd;

};

/**
 * Create CDATA section.
 *
 * @param {String} cdata CDATA body
 *
 * @return {String}
 */
JS2SVG.prototype.createCDATA = function(cdata) {

    return  this.config.cdataStart +
            cdata +
            this.config.cdataEnd;

};

/**
 * Create element tag.
 *
 * @param {Object} data element object
 *
 * @return {String}
 */
JS2SVG.prototype.createElem = function(data) {

    // beautiful injection for obtaining SVG information :)
    if (
        data.isElem('svg') &&
        data.hasAttr('width') &&
        data.hasAttr('height')
    ) {
        this.width = data.attr('width').value;
        this.height = data.attr('height').value;
    }

    // empty element and short tag
    if (data.isEmpty()) {

        return  this.createIndent() +
                this.config.tagShortStart +
                data.elem +
                this.createAttrs(data) +
                this.config.tagShortEnd;

    // non-empty element
    } else {
        var tagOpenStart = this.config.tagOpenStart,
            tagOpenEnd = this.config.tagOpenEnd,
            tagCloseStart = this.config.tagCloseStart,
            tagCloseEnd = this.config.tagCloseEnd,
            openIdent = '',
            closeIdent = '';

        if (data.isElem(textChildElem)) {
            tagOpenStart = defaults.tagOpenStart;
            tagCloseEnd = defaults.tagCloseEnd;
        } else {
            openIdent = this.createIndent();
        }

        if (data.isElem(textElem)) {
            tagOpenEnd = defaults.tagOpenEnd;
            tagCloseStart = defaults.tagCloseStart;
        } else {
            closeIdent = this.createIndent();
        }

        return  openIdent +
                tagOpenStart +
                data.elem +
                this.createAttrs(data) +
                tagOpenEnd +
                this.convert(data).data +
                closeIdent +
                tagCloseStart +
                data.elem +
                tagCloseEnd;

    }

};

/**
 * Create element attributes.
 *
 * @param {Object} elem attributes object
 *
 * @return {String}
 */
JS2SVG.prototype.createAttrs = function(elem) {

    var attrs = '';

    elem.eachAttr(function(attr) {

        attrs +=    ' ' +
                    attr.name +
                    this.config.attrStart +
                    String(attr.value).replace(this.config.regValEntities, this.config.encodeEntity) +
                    this.config.attrEnd;

    }, this);

    return attrs;

};

/**
 * Create text node.
 *
 * @param {String} text text
 *
 * @return {String}
 */
JS2SVG.prototype.createText = function(text) {

    return  this.config.textStart +
            text.replace(this.config.regEntities, this.config.encodeEntity) +
            this.config.textEnd;

};
