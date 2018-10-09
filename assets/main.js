$(function () {
    var client = ZAFClient.init();
    resize(client);
    //client.invoke('resize', {width: '100%', height: '200px'});

    // Custom fields are not available in the "ticket object", let's retrieve it first
    client.get(['ticket.customField:custom_field_'+ gOptions.issn_field_id,
        'ticket.customField:custom_field_'+ gOptions.eissn_field_id,
        'ticket.customField:custom_field_'+ gOptions.journal_name_field_id]).then(
        function (data) {
            var issn = data['ticket.customField:custom_field_'+ gOptions.issn_field_id];
            var eissn = data['ticket.customField:custom_field_'+ gOptions.eissn_field_id];
            var journal_name = data['ticket.customField:custom_field_'+ gOptions.journal_name_field_id];

            if (issn != null || eissn != null || journal_name != null) {
                requestOrpheusInfo(client, journal_name, issn, eissn);
            } else {
                showOrpheusError("The ticket does not contain any information to query Orpheus. " +
                    "Please fill in one of the following: issn/eissn or Journal name");
                resize(client);
            }
        }, function (response) {
            showError(response);
            resize(client);
        }
    );
});

/**
 Retrieve ticket information by ID
 **/
function requestTicketInfo(client, id) {
    var settings = {
        url: '/api/v2/tickets/' + id + '.json',
        type: 'GET',
        dataType: 'json',
    };

    client.request(settings).then(
        function (data) {
            /*
              Journal title field: 38889247
              ISSN field: 360009657254
              eISSN field: 360009578193
          */
            var issn = "";
            var eissn = "";
            var journalName = "";

            requestOrpheusInfo(client, journalName, issn, eissn);

            var issnArray = jQuery.map(data.ticket.fields, function (obj) {
                if (obj.id === 360009657254)
                    return obj.value; // or return obj.name, whatever.
            });
            var eissnArray = jQuery.map(data.ticket.fields, function (obj) {
                if (obj.id === 360009578193)
                    return obj.value; // or return obj.name, whatever.
            });
            var journalNameArray = jQuery.map(data.ticket.fields, function (obj) {
                if (obj.id === 38889247)
                    return obj.value; // or return obj.name, whatever.
            });

            journalName = journalNameArray[0];
            issn = issnArray[0];
            eISSN = eissnArray[0];

            if (issn == null && eiisn == null && journalName == null) {
                showOrpheusError("The ticket does not contain any information to query Orpheus. " +
                    "Please fill in one of the following: issn/eissn or Journal name")
            } else {
                requestOrpheusInfo(client, journalName, issn, eissn);
            }
        }, function (response) {
            showError(response);
        }
    );
}

/**
 Function to query Orpheus - attempt to query the following fields ordered by precedence:
 issn or eissn, journal name
 **/
function requestOrpheusInfo(client, journalName, issn, eissn) {
    /*
        Parameter for journal name ?name=
        Parameter for issn/eissn ?issn=
        API endpoint: https://orpheus-dev.lib.cam.ac.uk/policies/api/cambridge/
    */
    var orpheusUrl = "";

    if (issn != null && issn !== "") {
        orpheusUrl = gOptions.orpheus_api_url + "?issn=" + issn;
    } else if (eissn != null && eissn !== "") {
        orpheusUrl = gOptions.orpheus_api_url + "?issn=" + eissn;
    } else if (journalName != null && journalName !== "") {
        orpheusUrl = gOptions.orpheus_api_url + "?name=" + journalName;
    } else {
        // No information available to query Orpheus
        showOrpheusError("The ticket does not contain any information to query Orpheus. " +
            "Please fill in one of the following: issn/eissn or Journal name");
    }

    // CORS: true is only needed when testing with localhost, before installing the APP in Zendesk
    var settingsOrpheus = {
        url: orpheusUrl,
        cors: true,
        type: 'GET',
        dataType: 'json'
    };

    client.request(settingsOrpheus).then(
        function (data) {
            if (data != null && data.count > 0) {
                showOrpheusInfo(data);
                $('#save_button').show().click(function() {
                    setTicketFieldsFromOrpheusData(client, data);
                });
            } else {
                showOrpheusError("No results available in Orpheus.");
            }
            resize(client);
        },
        function (response) {
            showOrpheusError("Error while querying Orpheus API. Please consult with your administrator");
            resize(client);
        }
    );
}

function resize(client) {
    var height = $('body').outerHeight();
    client.invoke('resize', {
        width: '100%',
        height: height
    });
}
function setTicketFieldsFromOrpheusData(client, data) {
    var zd_apc_range= 'ticket.customField:custom_field_' + gOptions.apc_range_field_id;
    var zd_embargo_durationd = 'ticket.customField:custom_field_' + gOptions.embargo_duration_field_id;
    var zd_green_allowed_version = 'ticket.customField:custom_field_' + gOptions.green_allowed_version_field_id;
    var zd_gold_licence_options = 'ticket.customField:custom_field_' + gOptions.gold_licence_options_field_id;
    var zd_green_licence = 'ticket.customField:custom_field_' + gOptions.green_licence_field_id;

    var zd_apc_range_value= (data.results[0].zd_apc_range != null) ?  data.results[0].zd_apc_range : "";
    var zd_embargo_duration_value=(data.results[0].zd_embargo_duration != null) ?  data.results[0].zd_embargo_duration : "";
    var zd_green_allowed_version_value = (data.results[0].zd_green_allowed_version != null) ?  data.results[0].zd_green_allowed_version : "";
    var zd_gold_licence_options_value = (data.results[0].zd_gold_licence_options != null) ?  data.results[0].zd_gold_licence_options : "";
    var zd_green_licence_value = (data.results[0].zd_green_licence != null) ?  data.results[0].zd_green_licence : "";

    var ticket_fields = {};
    ticket_fields[zd_apc_range] = zd_apc_range_value;
    ticket_fields[zd_embargo_durationd] = zd_embargo_duration_value;
    ticket_fields[zd_green_allowed_version] = zd_green_allowed_version_value;
    ticket_fields[zd_gold_licence_options] = zd_gold_licence_options_value;
    ticket_fields[zd_green_licence] = zd_green_licence_value;


    client.set(ticket_fields).then(
        function(data) {
            console.log(data); // { 'ticket.subject': 'Printer Overheating Incident', 'ticket.type': 'incident' }
        }).catch(function(error) {
        console.log(error.toString()); // Error: "ticket.form.id" Invalid Ticket Form ID
    });
}

/* Auxiliary, results display functions */
function showOrpheusInfo(data) {

    // Are there any results?
    if (data == null || data.count == 0) {
        showOrpheusError("No results from Orpheus for the given search parameters." +
            "Please review information in Database.");
    }
    var orpheus_data = {
        'publisher_name': data.results[0].zd_publisher,
        'journal_apc_ange': data.results[0].zd_apc_range,
        'embargo_duration': data.results[0].zd_embargo_duration,
        'green_allowed_verion': data.results[0].zd_green_allowed_version,
        'gold_licence_options': data.results[0].zd_gold_licence_options
    };

    var source = $("#orpheus-template").html();
    var template = Handlebars.compile(source);
    var html = template(orpheus_data);
    $("#content").html(html);
}

function showError(response) {
    var error_data = {
        'status': response.status,
        'statusText': response.statusText
    };

    var source = $("#error-template").html();
    var template = Handlebars.compile(source);
    var html = template(error_data);
    $("#content").html(html);
}

function showOrpheusError(sms) {
    var contentObj = {
        'sms': sms
    };

    var source = $("#orpheus-error-template").html();
    var template = Handlebars.compile(source);
    var html = template(contentObj);
    $("#content").html(html);
}

/* Auxiliary, formatting functions */
function formatDate(date) {
    var cdate = new Date(date);
    var options = {
        year: "numeric",
        month: "short",
        day: "numeric"
    };
    date = cdate.toLocaleDateString("en-us", options);

    return date;
}
