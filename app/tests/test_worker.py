import unittest
import os
import json
from unittest.mock import patch, MagicMock
from app import worker, create_app, db
from app.models import PageDatum


class TaskTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        test_pages = []
        self.test_data = {}
        # with open('tests/page_data.json') as json_file:
        with open('tests/page_data.json') as json_file:
            self.test_data = json.load(json_file)
            for page in self.test_data['page_data']:
                foo = PageDatum(
                    page_id=page['page_id'], page_details=json.loads(page['page_details']))
                test_pages.append(foo)
        with open('tests/test_data.json') as json_file:
            self.test_data = {**self.test_data, **json.load(json_file)}
            for page in self.test_data['bad_oath_page']:
                foo = PageDatum(
                    page_id=page['page_id'], page_details=json.loads(page['page_details']))
                test_pages.append(foo)
        try:
            db.session.bulk_save_objects(test_pages)
            db.session.commit()
        except:
            pass

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()


    def test_process_result(self):
        results = worker.process_result(self.test_data['valid_process_result'])
        self.assertTrue(results)

    @patch('app.worker.tasks.gspread')
    @patch('app.worker.tasks.celery')
    def test_update_all_profile_links(self, mock_celery, mock_gspread):
        mock_gspread.authorize.return_value.open_by_key.return_value.worksheet.return_value.get_all_records.return_value = self.test_data["sample_worksheet_data"]
        results = worker.tasks.update_all_profile_links([json.loads(page['page_details'])['name'] for page in self.test_data['page_data']])
        calls = mock_celery.send_task.call_args_list
        for call in calls:
            args, kwargs = call
            # Harder attributes to assert, checked via mock_celery.signature
            kwargs.pop('kwargs')
            kwargs.pop('chain')
            self.assertEquals(
                kwargs, {'app': mock_celery, 'name': 'missionary_bot.tasks.get_profile_links'})
                
        for call in mock_celery.signature.call_args_list:
            args, kwargs = call
            self.assertEquals(args, ('app.worker.process_results',))
            self.assertEquals(kwargs, {'queue': 'results'})

        self.assertEquals(len(calls), len(self.test_data['page_data']))
        self.assertTrue(results)

    @patch('app.worker.tasks.gspread')
    @patch('app.worker.tasks.celery')
    def test_update_all_profile_links_with_links(self, mock_celery, mock_gspread):
        mock_gspread.authorize.return_value.open_by_key.return_value.worksheet.return_value.get_all_records.return_value = self.test_data["sample_worksheet_links_in_sheet"]
        results = worker.tasks.update_all_profile_links([json.loads(page['page_details'])['name'] for page in self.test_data['page_data']])
        calls = mock_celery.send_task.call_args_list

        self.assertEquals(len(calls), len(self.test_data['page_data']) * 2)
        self.assertTrue(results)

    def test_insert_row_into_sheet_processed_messaging(self):
        for test_data in self.test_data['sample_page_message_accept']:
            results = worker.tasks.insert_row_into_sheet(test_data)
            self.assertEqual(results, json.dumps({'status': 'Processed', 'page_id': test_data['entry'][0]['id']}))

    def test_insert_row_into_sheet_error_messaging(self):
        for test_data in self.test_data['sample_page_message_fail']:
            results = worker.tasks.insert_row_into_sheet(test_data)
            psid = test_data['entry'][0]['messaging'][0]['sender']['id']
            self.assertEqual(results, json.dumps(
                {'status': 'Error', 'retry': False, 'message': f"Failed to get ({psid}) user's name from facebook: error HTTP Error 400: Bad Request"}))

    def test_insert_row_into_sheet_processed_reactions(self):
        for test_data in self.test_data['sample_page_notifications_accept']:
            results = worker.tasks.insert_row_into_sheet(test_data)
            self.assertEquals(results, json.dumps({'status': 'Processed', 'page_id': test_data['entry'][0]['id']}))

    def test_insert_row_into_sheet_failed_reactions(self):
        for test_data in self.test_data['sample_page_notifications_reject']:
            results = worker.tasks.insert_row_into_sheet(test_data)
            self.assertEquals(results, json.dumps(
                {'status': 'Unprocessed', 'message': 'Reaction was a comment, video, or edited reaction'}))

    def test_insert_row_into_sheet_nonexistant_sheet_error(self):
        for test_data in self.test_data['sample_page_nonexistant_sheet_error']:
            results = worker.tasks.insert_row_into_sheet(test_data)
            page_id = test_data['entry'][0]['id']
            self.assertEqual(results, json.dumps(
                {'status': 'Error', 'retry': False, 'message': f'Searched for page {page_id} but no result was found'}))

    def test_insert_row_into_sheet_bad_oath_error(self):
        for test_data in self.test_data['sample_page_oath_error']:
            try:
                results = worker.tasks.insert_row_into_sheet(test_data)
            except Exception as e:
                self.assertEqual(str(e), json.dumps(
                    {"status": "Error", "message": "('invalid_grant: Bad Request', '{\\n  \"error\": \"invalid_grant\",\\n  \"error_description\": \"Bad Request\"\\n}')", "task_info": test_data}))
