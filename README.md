This app is for missionaries to quickly find members of their ward on facebook.
First create a bot and wait for it to authenticate.
Then it will start preloading a queue. Request the get-netx-profile to pop from that queue
if you go to fast the queue will empty before you can refil it and will need to wait a few seconds
once you are done using the bot get the delete-bot route to free up some memory
The interface for the program is a google sheet.
area id is the numbers of your area email

Wierd bugs:
If you are logged into multiple google accounts there is a change it might break.
To fix it sign out of all accounts except for the one the sheet was shared with or run the 
program in a private window. 

Example:
church_username->Tom
church_password->Riddle
facebook_username->lord_voldemort
facebook_password->I_dontlikeharry
pros_area_id->123456789
Create a bot
http://127.0.0.1:5000/create-bot?church_username=Tom&church_password=Riddle&facebook_username=lord_voldemort&facebook_password=I_dontlikeharry&pros_area_id=123456789

Check bot status
http://127.0.0.1:5000/bot-status?church_username=Tom

Get the next profile
http://127.0.0.1:5000/get-next-profile?church_username=Tom

Delete a bot
http://127.0.0.1:5000/delete-bot?church_username=Tom