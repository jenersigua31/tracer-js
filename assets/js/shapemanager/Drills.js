// -----------------------------------------------------------------------
// <copyright file="Drills.js.cs" company="Essilor">
// Created by: Carlos Cócera
// Created: 29/05/2013
// Modified by: Carlos Cócera
// Updated: 05/06/2013 
// </copyright>
// -----------------------------------------------------------------------

/* ************* Object Definitions ******************* */
var Orientation = { Center: 'Center', Nasal: 'Nasal', Temporal: 'Temporal' };
var Origin = { Center: 'Center', Edge: 'Edge', Box: 'Box' };

/* ************* Variables ******************* */
var drillsValidationErrors = [];

/* **************** Methods ********************** */
// <summary>
// Private method
// Type void
// Filters Origin
// </summary>
// <param name="ddlEl" type="DropDownList"></param>
function dropDownListOrientation_SelectedItemChanged(ddlEl) {
    drillsValidationErrors = [];
    var originEl = id('DropDownListOrigin');
    var orientationElValue = _getSelectedValue(ddlEl);

    _enableAllOptions(originEl); // Reset the synch dependency select box Origin
    _filterOrigin(orientationElValue); // Show only available options
}

// <summary>
// Private method
// Type void
// Filters Origin
// </summary>
// <param name="orientation" type="Control id"></param>
function _filterOrigin(orientation) {
    if (orientation) {
        var originEl = id('DropDownListOrigin');
        var orientationEl = id('DropDownListOrientation');
        switch (orientation) {
            case Orientation.Center:
                _disableOption(originEl, Origin.Box);
                _disableOption(originEl, Origin.Edge);

                // Force select Center in Orientation
                _setSelectedItem(originEl, Orientation.Center);
                _disableOption(orientationEl, Orientation.Nasal);
                _disableOption(orientationEl, Orientation.Temporal);
                break;
            case Orientation.Nasal:
            case Orientation.Temporal:
                _disableOption(originEl, Origin.Center);
                break;
            default:
                // Enable all
                _resetOption(originEl);
                _enableAllOptions(originEl);
                _enableAllOptions(orientationEl);
                _resetOption(orientationEl);
        }
        if (orientationEl.options[orientationEl.selectedIndex].disabled === true)
            _resetOption(originEl);
    }
}

// <summary>
// Private method
// Type void
// Filters Origin
// </summary>
// <param name="ddlEl" type="DropDownList"></param>
function dropDownListOrigin_SelectedItemChanged(ddlEl) {
    drillsValidationErrors = [];
    var orientationEl = id('DropDownListOrientation');
    var originElValue = _getSelectedValue(ddlEl);

    _enableAllOptions(orientationEl); // Reset the synch dependency select box orientation
    _filterOrientation(originElValue); // Show only available options
}

// <summary>
// Private method
// Type void
// Filters Origin
// </summary>
// <param name="origin" type="Control id"></param>
function _filterOrientation(origin) {
    if (origin) {
        var orientationEl = id('DropDownListOrientation');
        var originEl = id('DropDownListOrigin');
        switch (origin) {
            case Origin.Center:
                _disableOption(orientationEl, Orientation.Nasal);
                _disableOption(orientationEl, Orientation.Temporal);
                // Force select Center in Orientation
                _setSelectedItem(orientationEl, Origin.Center);
                _disableOption(originEl, Origin.Box);
                _disableOption(originEl, Origin.Edge);
                break;
            case Origin.Edge:
            case Origin.Box:
                _disableOption(orientationEl, Orientation.Center);
                break;
            default:
                // Select ... so enable all
                _enableAllOptions(orientationEl);
                _resetOption(orientationEl);
                _enableAllOptions(originEl);
                _resetOption(originEl);
        }
        if (orientationEl.options[originEl.selectedIndex].disabled === true)
            _resetOption(orientationEl);
    }
}

// <summary>
// Private method
// Type void
// Remove option from select control
// </summary>
// <param name="selectEl" type="Html <select/> control"></param>
// <param name="option" type="String"></param>
function _removeOption(selectEl, option) {
    for (var i = 0; i < selectEl.length; i++) {
        if (selectEl.options[i].value === option) {
            selectEl.remove(i);
        }
    }
}

// <summary>
// Private method
// Type void
// Remove option from select control
// </summary>
// <param name="selectEl" type="Html <select/> control"></param>
// <param name="option" type="String"></param>
function _removeOptionAt(selectEl, index) {
    if (index < selectEl.length) {
        selectEl.remove(index);
    }
}

// <summary>
// Private method
// Type void
// Remove option from select control
// </summary>
// <param name="selectEl" type="Html <select/> control"></param>
// <param name="option" type="String"></param>
function _disableOption(selectEl, option) {
    for (var i = 0; i < selectEl.length; i++) {
        if (selectEl.options[i].value === option) {
            selectEl.options[i].disabled = true;

            // If the disabled option is selected then reset the options
            if (selectEl.options[i].selected === true)
                _resetOption(selectEl);
        }
    }
}

// <summary>
// Private method
// Type void
// Resets select element to the first index option (default)
// </summary>
// <param name="selectEl" type="Html <select/> control"></param>
function _resetOption(selectEl) {
    selectEl.options[0].selected = true;
}

// <summary>
// Private method
// Type void
// Enables all select options
// </summary>
// <param name="selectEl" type="Html <select/> control"></param>
function _enableAllOptions(selectEl) {
    for (var i = 0; i < selectEl.length; i++) {
        selectEl.options[i].disabled = false;
    }
}

// <summary>
// Private method
// Type string var
// Returns the selected option value
// </summary>
// <param name="selectEl" type="Html <select/> control"></param>
function _getSelectedValue(selectEl) {
    var index = id(selectEl.id).selectedIndex;
    return id(selectEl.id).options[index].value;
}

/// <summary>
/// Event method
/// Type void
/// </summary>
// <param name="event" type="event"></param>
function validateDrillPointData() {
    var validated = true;
    drillsValidationErrors = [];

    if (_validateSelections(Origin, id('DropDownListOrigin')) === false)
        drillsValidationErrors.push(originError);

    if (_validateSelections(Orientation, id('DropDownListOrientation')) === false)
        drillsValidationErrors.push(orientationError);

    if (drillsValidationErrors.length > 0)
        validated = _showErrors(drillsValidationErrors);

    return validated;
}

// <summary>
// Private method
// Type bool
// Returns if value exists inside object
// </summary>
// <param name="enumSet" type="Object"></param>
// <param name="selectEl" type="Html <select/> control"></param>
function _validateSelections(enumSet, selectEl) {
    return isValueInEnum(enumSet, selectEl.options[selectEl.selectedIndex].value);
}

// <summary>
// Private method
// Type bool
// Returns if value exists inside object
// </summary>
// <param name="enumSet" type="Object"></param>
// <param name="value" type="string"></param>
function isValueInEnum(enumSet, value) {

    if (enumSet.hasOwnProperty(value)) {
        return true;
    }

    return false;
}

// <summary>
// Private method
// Type string var
// Shows error [] messages
// </summary>
// <param name="errors" type="String[]"></param>
function _showErrors(errors) {
    var message = '';
    for (var i = 0; i < errors.length; i++) {
        message += errors[i] + '\n';
    }

    if (message !== '') {
        if (id('divLoadingimage') != null)
            id('divLoadingimage').style.display = 'none';

        console.log(message);
        return false;
    }

    return true;
}

// <summary>
// Private method
// Type void
// Sets select control selected item
// </summary>
// <param name="selectEl" type="Html <select/> control"></param>
// <param name="value" type="stringl">Option to select</param>
function _setSelectedItem(selectEl, value) {
    if (value != null) {
        for (var i = 0; i < selectEl.length; i++) {
            if (selectEl.options[i].value === value) {
                selectEl.selectedIndex = i;
                selectEl.options[i].selected = true;
            }
        }
    }
}