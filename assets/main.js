Handlebars.registerPartial("ftLinkPartial", $("#ft-link-partial").html());

$(function () {
    var client = ZAFClient.init();
    resize(client);
    //client.invoke('resize', {width: '100%', height: '200px'});

    // Custom fields are not available in the "ticket object", let's retrieve it first
    client.get(['ticket.customField:custom_field_'+ gOptions.issn_field_id,
        'ticket.customField:custom_field_'+ gOptions.eissn_field_id,
        'ticket.customField:custom_field_'+ gOptions.journal_name_field_id,
        'ticket.customField:custom_field_'+ gOptions.apollo_id_field_id]).then(
        function (data) {
            var issn = data['ticket.customField:custom_field_'+ gOptions.issn_field_id];
            var eissn = data['ticket.customField:custom_field_'+ gOptions.eissn_field_id];
            var journal_name = data['ticket.customField:custom_field_'+ gOptions.journal_name_field_id];
            var apollo_id = data['ticket.customField:custom_field_'+ gOptions.apollo_id_field_id];

            if (issn != null || eissn != null || journal_name != null) {
                requestOrpheusInfo(client, journal_name, issn, eissn, apollo_id);
            } else {
                showOrpheusError("The ticket does not contain any information to query Orpheus. " +
                    "Please fill in one of the following: issn/eissn or Journal name", apollo_id);
                resize(client);
            }
        }, function (response) {
            showError(response);
            resize(client);
        }
    );
});

// /**
//  Retrieve ticket information by ID - not needed for now
//  **/
// function requestTicketInfo(client, id) {
//     var settings = {
//         url: '/api/v2/tickets/' + id + '.json',
//         type: 'GET',
//         dataType: 'json',
//     };
//
//     client.request(settings).then(
//         function (data) {
//             /*
//               Journal title field: 38889247
//               ISSN field: 360009657254
//               eISSN field: 360009578193
//           */
//             var issn = "";
//             var eissn = "";
//             var journalName = "";
//
//             requestOrpheusInfo(client, journalName, issn, eissn);
//
//             var issnArray = jQuery.map(data.ticket.fields, function (obj) {
//                 if (obj.id === 360009657254)
//                     return obj.value; // or return obj.name, whatever.
//             });
//             var eissnArray = jQuery.map(data.ticket.fields, function (obj) {
//                 if (obj.id === 360009578193)
//                     return obj.value; // or return obj.name, whatever.
//             });
//             var journalNameArray = jQuery.map(data.ticket.fields, function (obj) {
//                 if (obj.id === 38889247)
//                     return obj.value; // or return obj.name, whatever.
//             });
//
//             journalName = journalNameArray[0];
//             issn = issnArray[0];
//             eISSN = eissnArray[0];
//
//             if (issn == null && eiisn == null && journalName == null) {
//                 showOrpheusError("The ticket does not contain any information to query Orpheus. " +
//                     "Please fill in one of the following: issn/eissn or Journal name")
//             } else {
//                 requestOrpheusInfo(client, journalName, issn, eissn);
//             }
//         }, function (response) {
//             showError(response);
//         }
//     );
// }

/**
 Function to query Orpheus - attempt to query the following fields ordered by precedence:
 issn or eissn, journal name
 **/
function requestOrpheusInfo(client, journalName, issn, eissn, apollo_id) {
    /*
        Parameter for journal name ?name=
        Parameter for issn/eissn ?issn=
        API endpoint: https://orpheus-[dev|prod].lib.cam.ac.uk/policies/api/cambridge/

        Parameter apollo_id is simply passed to appropriate display function; it is not used in the call to Orpheus
    */
    var orpheusUrl = "";

    if (issn != null && issn !== "") {
        orpheusUrl = gOptions.orpheus_api_url + "?issn=" + issn;
    } else if (eissn != null && eissn !== "") {
        orpheusUrl = gOptions.orpheus_api_url + "?issn=" + eissn;
    } else if (journalName != null && journalName !== "") {
        orpheusUrl = gOptions.orpheus_api_url + "?name=" + encodeURIComponent(journalName);
    } else {
        // No information available to query Orpheus
        showOrpheusError("The ticket does not contain any information to query Orpheus. " +
            "Please fill in one of the following: issn/eissn or Journal name", apollo_id);
    }

    // CORS needed for cross-domain issues with redirects
    var settingsOrpheus = {
        url: orpheusUrl,
        cors: true,
        type: 'GET',
        dataType: 'json'
    };

    client.request(settingsOrpheus).then(
        function (data) {
            if (data != null && data.count > 0) {
                showOrpheusInfo(data, apollo_id);
                $('#save_button').show().click(function() {
                    setTicketFieldsFromOrpheusData(client, data);
                });
            } else {
                showOrpheusError("No results available in Orpheus.", apollo_id);
            }
            resize(client);
        },
        function (response) {
            showOrpheusError("Error while querying Orpheus API. Try reloading the app, and if the error persists " +
                "contact the administrator.", apollo_id);
            resize(client);
        }
    ).catch(function(error) {
        showOrpheusError(error, apollo_id);
        resize(client);
    });
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
    var zd_embargo_duration = 'ticket.customField:custom_field_' + gOptions.embargo_duration_field_id;
    var zd_green_allowed_version = 'ticket.customField:custom_field_' + gOptions.green_allowed_version_field_id;
    var zd_gold_licence_options = 'ticket.customField:custom_field_' + gOptions.gold_licence_options_field_id;
    var zd_green_licence = 'ticket.customField:custom_field_' + gOptions.green_licence_field_id;
    var zd_journal_oa_status = 'ticket.customField:custom_field_' + gOptions.journal_oa_status_field_id;
    var zd_publisher = 'ticket.customField:custom_field_' + gOptions.publisher_name_id;

    var zd_apc_range_value= (data.results[0].zd_apc_range != null) ?  data.results[0].zd_apc_range : "";
    var zd_embargo_duration_value=(data.results[0].zd_embargo_duration != null) ?  data.results[0].zd_embargo_duration : "";
    var zd_green_allowed_version_value = (data.results[0].zd_green_allowed_version != null) ?  data.results[0].zd_green_allowed_version : "";
    var zd_gold_licence_options_value = (data.results[0].zd_gold_licence_options != null) ?  data.results[0].zd_gold_licence_options : [];
    var zd_green_licence_value = (data.results[0].zd_green_licence != null) ?  data.results[0].zd_green_licence : "";
    var zd_journal_oa_status_value = (data.results[0].zd_journal_oa_status != null) ?  data.results[0].zd_journal_oa_status : "";
    var zd_publisher_value = (data.results[0].zd_publisher != null) ?  data.results[0].zd_publisher : "";

    var ticket_fields = {};
    ticket_fields[zd_apc_range] = zd_apc_range_value;
    ticket_fields[zd_embargo_duration] = zd_embargo_duration_value;
    ticket_fields[zd_green_allowed_version] = zd_green_allowed_version_value;
    ticket_fields[zd_gold_licence_options] = zd_gold_licence_options_value;
    ticket_fields[zd_green_licence] = zd_green_licence_value;
    ticket_fields[zd_journal_oa_status] = zd_journal_oa_status_value;
    ticket_fields[zd_publisher] = zd_publisher_value;

    client.set(ticket_fields).then(
        function(data) {
            console.log(data);
        }).catch(function(error) {
        console.log(error.toString());
    });
}

/* Auxiliary, results display functions */
function showOrpheusInfo(data, apollo_id) {

    // Are there any results?
    if (data == null || data.count === 0) {
        showOrpheusError("No results from Orpheus for the given search parameters." +
            "Please review Zendesk field '#Journal title'.");
    }
    console.log(data)
    var orpheus_data = {
        'orpheus_id': data.results[0].id,
        'publisher_name': data.results[0].zd_publisher,
        'journal_apc_range': data.results[0].zd_apc_range,
        'commitment': data.results[0].zd_commitment_guidance,
        'embargo_duration': friendlyEmbargo(data.results[0].zd_embargo_duration),
        'green_allowed_version': friendlyVersion(data.results[0].zd_green_allowed_version),
        'green_licence': friendlyLicence(data.results[0].zd_green_licence),
        'journal_oa_status': friendlyOaStatus(data.results[0].zd_journal_oa_status),
        'gold_licence_options': data.results[0].zd_gold_licence_options != null ?
            data.results[0].zd_gold_licence_options.map(x => friendlyLicence(x)) : "",
        'deal': data.results[0].zd_deal,
        'epmc_participation': data.results[0].zd_epmc_participation,
        'epmc_embargo_months': data.results[0].zd_epmc_embargo_months,
        'epmc_open_licence': data.results[0].zd_epmc_open_licence,
        'epmc_deposit_status': data.results[0].zd_epmc_deposit_status,
        'romeo_url': data.results[0].romeo_url,
        'apollo_id': apollo_id
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

function showOrpheusError(sms, apollo_id) {
    var contentObj = {
        'sms': sms,
        'apollo_id': apollo_id
    };

    var source = $("#orpheus-error-template").html();
    var template = Handlebars.compile(source);
    var html = template(contentObj);
    $("#content").html(html);
}

/* Auxiliary, formatting functions */
function friendlyEmbargo(tag) {
    var embargo_duration_dict = {
        '0_months': '0 months',
        '2_months': '2 months',
        '3_months': '3 months',
        '6_months': '6 months',
        '12_months': '12 months',
        '18_months': '18 months',
        '24_months': '24 months',
        '36_months': '36 months',
        '48_months': '48 months',
        '5_years': '5 years',
        '9_months': '9 months'
        };

        return embargo_duration_dict[tag];
}

function friendlyLicence(tag) {
    var licence_dict = {
        'cc-by': 'CC BY',
        'cc_by_nc': 'CC BY-NC',
        'cc_by_nc_nd': 'CC BY-NC-ND',
        'cc_by_nc_sa': 'CC BY-NC-SA',
        'cc_by_nd': 'CC BY-ND',
        'cc_by_sa': 'CC BY-SA',
        'custom_licence': 'Custom',
        'unclear_licence': 'Unclear',
        'gold_cc_by': 'CC BY',
        'gold_cc_by_nd': 'CC BY-ND',
        'gold_cc_by_sa': 'CC BY-SA',
        'gold_cc_by_nc': 'CC BY-NC',
        'gold_cc_by_nc_nd': 'CC BY-NC-ND',
        'gold_cc_by_nc_sa': 'CC BY-NC-SA',
        'gold_cc0': 'CC0',
        'gold_custom': 'Custom',
        'gold_unclear': 'Unclear'
        };

        return licence_dict[tag];
}

function friendlyVersion(tag) {
    var green_version_dict = {
        'aam': 'AAM',
        'no_version_allowed': 'No version allowed',
        'oa_journal_conference': 'Open Access journal/conference',
        'pre_print': 'Pre-print',
        'version_of_record': 'Version of record'
    };

    return green_version_dict[tag];
}

function friendlyOaStatus(tag) {
    var oa_status_dict = {
        'journal_oa_status_hybrid': 'Hybrid',
        'journal_oa_status_open_access': 'Fully Open Access',
        'journal_oa_status_subscription': 'Subscription'
    };

    return oa_status_dict[tag];
}

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
