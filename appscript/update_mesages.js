function getAllUpdates() {
  return [
    {
      name: 'Authentication Errors Update',
      message: `○ Updated Page Interaction Manager settings to now show if you are disconnected from google or facebook
      ○ Page Interaction Manager Settings now has an option to reauthenticat with google and facebook`,
      date: '8/7/21'
    },
    {
      name: 'Feedback Update',
      message: `○ Feature: Under Page Interaction Manager Feedback you can now fill out a bug report or feature request
      ○ Feature: Added the option to select a default status and/or assignment`,
      date: '8/8/21'
    },
    {
      name: 'Profile Link Update',
      message: `○ Updated the profile link finder so if it can't find a link it will state Not Found`,
      date: '8/8/21'
    },
    {
      name: 'Highlight Update',
      message: `Check out the Highlight setting, give us your feedback
      ○ Feature: Page highlighting now will highlight the entire row, and do alternating colors for assignment
      ○ Feature: Select will no longer highlight the whole row red, but just the select status.`,
      date: '8/21/21'
    },
    {
      name: 'Settings Overhaul Update',
      message: `○ Feature: Updated the look of the settings page
      ○ Feature: Updated settings to now have three tabs regular, advanced, and Auth
        ○ Regular - Normal settings page with drop down menus, color pickers, etc
        ○ Advanced - Settings in a text format, usefull for duplicating settings across sheets
        ○ Auth - Section for connecting to Facebook, Google, etc. The section will have a red notification dot if something is no longer authorized`,
      date: '9/5/21'
    },
    {
      name: 'Update View Feature',
      message: `○ Feature: Added menu item under the add on Missionary Tools called Updates
      ○ Feature: Update view which allows you to view all previous updates since recorded.`,
      date: '9/7/21'
    },
    {
      name: 'QR Code Manager Feature',
      message: `○ Feature: Added Page Interaction Manager > QR Code Manager that generates into-app deep-linking QR codes for Facebook pages, more reliable than Facebooks' codes
      ○ Feature: QR codes can be downloaded in PNG or SVG`,
      date: '9/10/21'
    }
  ]
}