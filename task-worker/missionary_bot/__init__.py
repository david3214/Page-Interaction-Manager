from .bot import MissionaryBot
from .config import config, Config
from .tasks import test_task, get_profile_links, find_member_profiles, insert_row_in_sheet, add_friend, send_message, get_all_page_followers, get_all_page_likes, get_group_members

def create_bot(config_name='default'):
    bot = MissionaryBot(config[config_name])
    return bot