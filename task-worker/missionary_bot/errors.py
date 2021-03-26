class MissionaryBotError(Exception):
    """A base class for MyProject exceptions."""
    pass

class AuthenticationError(MissionaryBotError):
    """Raised bot fails to authenticate"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args)
        self.provider = kwargs.get('provider')
        print(f"Failed to authenticate with {self.provider}")