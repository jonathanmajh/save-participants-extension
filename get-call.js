// This script is used to obtain the call object from the Angular
// controller in the page

async function sp_microsoft_teams_get_call_handler() {
    const roster = document.querySelectorAll('[data-cid="roster-participant"]');
    let participants = {};
    for (let i = 0; i < roster.length; i++) {
        let details = roster[i].dataset.tid.split('-')
        console.log(details)
        if (details[0] == 'participantsInCall') {
            participants[i] = {
                'id': i,
                'name': details[1]
            }
        }
    }
    console.log(participants);

    // // The others have the MRI as id, so we can use it to
    // // get the complete profiles
    // let mris = Object.keys(participants);
    // let profiles = await peopleService.getAllPeopleProfile(mris);

    // // Add the profiles to the participants
    // for (i = 0; i < profiles.length; i++) {
    //     if (participants.hasOwnProperty(profiles[i].mri)) {
    //         participants[profiles[i].mri].profile = profiles[i];
    //     }
    // }


    let event = new CustomEvent('sp_microsoft_teams_get_call', {
        detail: {
            'participants': participants
        }
    });

    document.dispatchEvent(event);
};
console.log('get call script loaded');
sp_microsoft_teams_get_call_handler();

// data-tid="calling-right-side-panel"
// data-tid="calling-roster-wrapper"
// data-cid="calling-roster"
//data-cid="roster-participant"
// dataset: {
//     "isFocusable": "false",
//     "cid": "roster-participant",
//     "tag": "refactored",
//     "tid": "participantsInCall-Jonathan Ma"
// }