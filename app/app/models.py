# coding: utf-8
from . import db

class PageDatum(db.Model):
    __tablename__ = 'page_data'

    page_id = db.Column(db.String(50, 'utf8mb4_unicode_ci'), primary_key=True)
    page_details = db.Column(db.JSON, nullable=False)


class Preference(db.Model):
    __tablename__ = 'preferences'

    sheet_id = db.Column(db.String(100, 'utf8mb4_unicode_ci'), primary_key=True)
    preference = db.Column(db.JSON, nullable=False)


class User(db.Model):
    __tablename__ = 'users'

    user_id = db.Column(db.String(100, 'utf8mb4_unicode_ci'), primary_key=True)
    id_token = db.Column(db.String(2000, 'utf8mb4_unicode_ci'), nullable=False)