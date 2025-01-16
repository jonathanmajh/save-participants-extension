chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log("Received action:", message);
    if (message == 'sp-monitor-is-enabled') {
        sendResponse(sp_monitor_is_enabled());
    } else if (message == 'sp_download_list') {
        sp_download_list();
        sendResponse('ok1');
    } else if (message == 'sp_start_monitor') {
        sp_start_monitor();
        sendResponse('ok3');
    } else if (message == 'sp_stop_monitor') {
        sp_stop_monitor();
        sendResponse('ok4');
    } else if (message == 'number_of_participants') {
        number_of_participants().then((result) => {
            sendResponse(result); 
        });
    } else {
        console.log('Invalid message received');
    }
    return true;
});
// TODO add function to check if extension is running properlly at a glance
// ie return number of detected partipients

async function number_of_participants() {
    let participants = await sp_get_participants();
    return Object.keys(participants).length;
}

async function sp_get_global(name) {
    return new Promise((res, rej) => {
        data = {}; data[name] = null;

        chrome.storage.local.get(data, function (items) {
            if (chrome.runtime.lastError) {
                rej('Failed to get key: ' + name);
            }
            else {
                res(JSON.parse(items[name]));
            }
        });
    });
}

async function sp_set_global(name, value) {
    return new Promise((res, rej) => {
        data = {}; data[name] = JSON.stringify(value);

        chrome.storage.local.set(data, function () {
            if (chrome.runtime.lastError) {
                rej('Failed to set key: ' + name);
            }
            else {
                res();
            }
        });
    })
}

function sp_monitor_is_enabled() {
    let html = document.getElementsByTagName('html')[0];

    if (!html.hasAttribute('data-sp-monitor')) {
        return false;
    }

    return html.getAttribute('data-sp-monitor') == 'on';
}

function sp_monitor_set_enabled(enabled) {
    let html = document.getElementsByTagName('html')[0];
    html.setAttribute('data-sp-monitor', enabled ? 'on' : 'off');
}

// Wait for a precsribed number of milliseconds inside an async function.
//
// This function has to be called with: await sp_timeout(N);
async function sp_timeout(N) {
    await new Promise(function (resolve, reject) {
        setTimeout(resolve, N);
    });
}

async function sp_microsoft_teams_get_participants_v2() {
    var sp_teams_listener = null;

    // We only return a Promise that will be resolved then the
    // code in the page is actually executed
    let participants = await new Promise(function (resolve, reject) {
        let s = document.createElement('script');
        sp_teams_listener = function (d) {
            resolve(d.detail.participants);
        }

        document.addEventListener('sp_microsoft_teams_get_call', sp_teams_listener);

        // Inject the code into the page
        s.src = chrome.runtime.getURL('get-call.js');
        (document.head || document.documentElement).appendChild(s);

        s.onload = function () {
            s.parentNode.removeChild(s);
        }

        s.onerror = function () {
            reject(new Error("Failed to load script"));
        };
    });

    if (sp_teams_listener != null) {
        document.removeEventListener(
            'sp_microsoft_teams_get_call',
            sp_teams_listener
        );
    }

    return participants;
}

function sp_trigger_participants_download(participants) {
    let participants_list = "";

    for (var id in participants) {
        let line = participants[id]['name'];

        participants_list = participants_list + line + '\n';
    }

    if (participants_list == "") {
        alert('No participants found!\nPlease check that the sidebar containing the list of participants is open.');
    } else {
        sp_trigger_download(participants_list);
    }
}

function sp_trigger_download(content, monitor) {
    chrome.runtime.sendMessage({
        action: 'download',
        message: content,
        monitor: monitor
    },
        function (response) {
            if (chrome.runtime.lastError) {
                console.log('ERROR: ' + chrome.runtime.lastError);
            } else {
                if (response.status != 'completed') {
                    console.log('Download failed');
                }
            }
        }
    );
}

async function sp_get_participants() {
    let participants = null;

    participants = await sp_microsoft_teams_get_participants_v2();

    return participants;
}

async function sp_download_list() {
    let participants = await sp_get_participants();
    sp_trigger_participants_download(participants);
}

async function sp_update_events() {

    let sp_monitor_events = await sp_get_global('sp-monitor-events');
    let sp_monitor_last_participants = await sp_get_global('sp-monitor-last-participants');

    if (sp_monitor_is_enabled()) {
        let participants = await sp_get_participants();

        let joined_participants = {};
        let left_participants = {};

        for (var id in participants) {
            if (!(id in sp_monitor_last_participants)) {
                joined_participants[id] = participants[id];
            }
        }

        for (var id in sp_monitor_last_participants) {
            if (!(id in participants)) {
                left_participants[id] = sp_monitor_last_participants[id];
            }
        }

        await sp_set_global('sp-monitor-last-participants', participants);

        // Add relevant events
        if (Object.keys(joined_participants).length > 0) {
            sp_monitor_events.push({
                'timestamp': new Date(),
                'event': 'join',
                'participants': joined_participants
            });
        }

        if (Object.keys(left_participants).length > 0) {
            sp_monitor_events.push({
                'timestamp': new Date(),
                'event': 'leave',
                'participants': left_participants
            });
        }

        await sp_set_global('sp-monitor-events', sp_monitor_events);
    }

    if (sp_monitor_is_enabled()) {
        setTimeout(sp_update_events, 15000);
    } else {
        // sp_download_monitor();
    }
}

async function sp_download_monitor() {
    let content = "";
    let sp_monitor_events = await sp_get_global('sp-monitor-events');

    for (var event in sp_monitor_events) {
        let data = sp_monitor_events[event];

        if (data['event'] == 'join') {
            content += data['timestamp'].toString() + "\n";
            content += 'The following participants have joined:\n';
            for (var id in data['participants']) {
                let name = data['participants'][id]['name'];
                content += '  ' + name + '\n';
            }
            content += "\n\n";
        }

        if (data['event'] == 'leave') {
            content += data['timestamp'].toString() + "\n";
            content += 'The following participants have left:\n';
            for (var id in data['participants']) {
                let name = data['participants'][id]['name'];
                content += '  ' + name + '\n';
            }
            content += "\n\n";
        }
    }

    // Before terminating, reset the memory so that it won't be found 
    // on the next startup. 
    await sp_set_global('sp-monitor-last-participants', null);
    await sp_set_global('sp-monitor-events', null);

    sp_trigger_download(content, true);
}

async function sp_start_monitor() {
    sp_monitor_set_enabled(true);

    // Check if we find a running session in memory
    let old_participants = await sp_get_global('sp-monitor-last-participants');
    if (old_participants != null) {
        console.log('SAVE_PARTICIPANTS // Found old monitor session in memory: recovering');

        alert("Found an old monitor session in memory: continuing. \n\n" +
            "If you wish to start a new session please stop and start again.");
    }
    else {
        let sp_monitor_last_participants = await sp_get_participants();

        let sp_monitor_events = [{
            'timestamp': new Date(),
            'event': 'join',
            'participants': sp_monitor_last_participants
        }];

        await sp_set_global('sp-monitor-last-participants', sp_monitor_last_participants);
        await sp_set_global('sp-monitor-events', sp_monitor_events);
    }

    setTimeout(sp_update_events, 10000);
}

async function sp_stop_monitor() {
    sp_monitor_set_enabled(false);
    sp_download_monitor();
}