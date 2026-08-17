from datetime import date, timedelta

# NSE Holidays for Equity Segment (2024)
# Add 2025 and future years as needed.
NSE_HOLIDAYS_2024 = {
    date(2024, 1, 22),  # Special Holiday
    date(2024, 1, 26),  # Republic Day
    date(2024, 3, 8),   # Mahashivratri
    date(2024, 3, 25),  # Holi
    date(2024, 3, 29),  # Good Friday
    date(2024, 4, 11),  # Id-Ul-Fitr (Ramadan Eid)
    date(2024, 4, 17),  # Shri Ram Navmi
    date(2024, 5, 1),   # Maharashtra Day
    date(2024, 5, 20),  # General Elections (Mumbai)
    date(2024, 6, 17),  # Bakri Id
    date(2024, 7, 17),  # Muharram
    date(2024, 8, 15),  # Independence Day / Parsi New Year
    date(2024, 10, 2),  # Mahatma Gandhi Jayanti
    date(2024, 11, 1),  # Diwali Laxmi Pujan (Muhurat Trading happens, but regular day is closed. We can consider it closed for EOD processing unless handled specially)
    date(2024, 11, 15), # Gurunanak Jayanti
    date(2024, 12, 25), # Christmas
}

# NSE Holidays for Equity Segment (2025)
NSE_HOLIDAYS_2025 = {
    date(2025, 2, 26),  # Mahashivratri
    date(2025, 3, 14),  # Holi
    date(2025, 3, 31),  # Id-Ul-Fitr (Ramadan Eid)
    date(2025, 4, 10),  # Mahavir Jayanti
    date(2025, 4, 14),  # Dr. Baba Saheb Ambedkar Jayanti
    date(2025, 4, 18),  # Good Friday
    date(2025, 5, 1),   # Maharashtra Day
    date(2025, 8, 15),  # Independence Day
    date(2025, 8, 27),  # Ganesh Chaturthi
    date(2025, 10, 2),  # Mahatma Gandhi Jayanti
    date(2025, 10, 22), # Diwali Balipratipada
    date(2025, 11, 5),  # Gurunanak Jayanti
    date(2025, 12, 25), # Christmas
}

# NSE Holidays for Equity Segment (2026)
NSE_HOLIDAYS_2026 = {
    date(2026, 1, 26),  # Republic Day
    date(2026, 3, 3),   # Holi
    date(2026, 3, 20),  # Id-Ul-Fitr (Ramadan Eid)
    date(2026, 4, 3),   # Good Friday
    date(2026, 4, 14),  # Dr. Baba Saheb Ambedkar Jayanti
    date(2026, 5, 1),   # Maharashtra Day
    date(2026, 5, 27),  # Bakri Id
    date(2026, 8, 15),  # Independence Day
    date(2026, 10, 2),  # Mahatma Gandhi Jayanti
    date(2026, 11, 8),  # Diwali Laxmi Pujan
    date(2026, 11, 24), # Gurunanak Jayanti
    date(2026, 12, 25), # Christmas
}

# Combine all years
ALL_NSE_HOLIDAYS = NSE_HOLIDAYS_2024 | NSE_HOLIDAYS_2025 | NSE_HOLIDAYS_2026

# Some Saturdays might be working days for special trading sessions
SPECIAL_TRADING_SESSIONS = {
    date(2024, 3, 2),
    date(2024, 5, 18),
}

def is_market_open(check_date: date = None) -> bool:
    """
    Check if the market was open on a given date.
    If no date is provided, checks for today.
    """
    if check_date is None:
        check_date = date.today()
        
    # Check special sessions first
    if check_date in SPECIAL_TRADING_SESSIONS:
        return True
        
    # Check weekends (5 = Saturday, 6 = Sunday)
    if check_date.weekday() in (5, 6):
        return False
        
    # Check known holidays
    if check_date in ALL_NSE_HOLIDAYS:
        return False
        
    return True

def get_trading_days_between(start_date: date, end_date: date) -> int:
    """
    Returns the number of trading days strictly between start_date and end_date (inclusive).
    """
    if start_date > end_date:
        return 0
        
    trading_days = 0
    current_date = start_date
    while current_date <= end_date:
        if is_market_open(current_date):
            trading_days += 1
        current_date += timedelta(days=1)
        
    return trading_days
