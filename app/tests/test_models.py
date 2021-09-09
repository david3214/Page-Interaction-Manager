import unittest
import json
from app import create_app, db
from app.models import PageDatum, Preference, User

class UserModelTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_PageDatum(self):
        page = PageDatum(page_id=100, page_details="{\"category\":\"Religious Organization\",\"access_token\":\"*****\",\"name\":\"BadOauth in Dickinson, ND\",\"category_list\":[{\"name\":\"Religious Organization\",\"id\":\"187714557925874\"}],\"id\":\"105691394435112\",\"tasks\":[\"ANALYZE\",\"ADVERTISE\",\"MESSAGING\",\"MODERATE\",\"CREATE_CONTENT\",\"MANAGE\"],\"google_sheets\":{\"id\":\"13bR4w9Q3w8DYJ7N_gJecwxaTsQMSaRfVp67sJeR1Los\",\"token\":\"\",\"refresh_token\":\"1//04z718hKFOaSMCgYIARAAGAQSNwF-L9IrYahGv6cth_0P-X5CuR5toX4AFagprwfHmwryf_BYSjBJDls0Gmm9PU4SMKdvMP_vT0o\"}}")
        db.session.add(page)
        db.session.commit()

        myPage = PageDatum.query.get(100)
        self.assertEquals(page.page_id, myPage.page_id)
        self.assertEquals(page.page_details, myPage.page_details)

    def test_Preference(self):
        preference = Preference(sheet_id='ASFGKDH152GKDAG_12SADAgd1asd', preference=json.dumps({"statusList" : ["Select", "Left on Read", "Rejected", "Do Not Contact", "Outside Mission", "Member", "Missionary", "Non Member", "Sent Friend Request", "Currently Messaging", "Teaching", "Baptized", "Stopped Teaching"],"hiddenStatuses" : ["Member", "Missionary", "Do Not Contact", "Rejected"],"statusToMerge": ["Member", "Missionary", "Do Not Contact", "Rejected"],"assignmentMap" : [['Unassigned', '#82C1EC'], ['Ward 1', '#F28530'], ['Ward 2', '#FCFBC2'], ['Ward 3', '#ECE3D4'], ['Ward 4', '#F9F85F']],"adIDMap" : {"Source Link Here": "Ad Name here"},"sheetSettings": {"Ad Likes": { "highlightEnabled": True, "sortingEnabled": True, "mergingEnabled": True },"Page Messages": { "highlightEnabled": False, "sortingEnabled": True, "mergingEnabled": True }},}))
        db.session.add(preference)
        db.session.commit()

        myPreference = Preference.query.get('ASFGKDH152GKDAG_12SADAgd1asd')
        self.assertEquals(preference.sheet_id, myPreference.sheet_id)
        self.assertEquals(preference.preference, myPreference.preference)

    def test_User(self):
        user = User(user_id=100, id_token=json.dumps({"name":"support","email":"fake@gmail.com"}))
        db.session.add(user)
        db.session.commit()

        myUser = User.query.get(100)
        self.assertEquals(user.user_id, myUser.user_id)
        self.assertEquals(user.id_token, myUser.id_token)

