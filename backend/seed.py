import os
import random
import django
from decimal import Decimal
from datetime import timedelta

# Set up Django environment settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core_crm.settings')
django.setup()

from django.utils import timezone
from crm_app.models import Shopper, Order, Campaign, DeliveryLog

# Define matrices of realistic Indian names and locations
FIRST_NAMES = [
    'Priya', 'Rohan', 'Amit', 'Sneha', 'Vikram', 'Ananya', 'Aarav', 'Divya', 'Rahul', 'Neha',
    'Aditya', 'Kavya', 'Siddharth', 'Pooja', 'Arjun', 'Riya', 'Karan', 'Shreya', 'Kabir', 'Tanvi',
    'Manish', 'Jyoti', 'Raj', 'Deepa', 'Sanjay', 'Sunita', 'Abhishek', 'Swati', 'Harsh', 'Meera',
    'Ravi', 'Preeti', 'Vijay', 'Kiran', 'Anil', 'Anita', 'Sunil', 'Geeta', 'Ramesh', 'Rekha',
    'Yash', 'Ishaan', 'Nisha', 'Pranav', 'Ritu', 'Dev', 'Aditi', 'Alok', 'Shalini', 'Gaurav'
]

LAST_NAMES = [
    'Sharma', 'Verma', 'Patel', 'Reddy', 'Singh', 'Gupta', 'Kumar', 'Joshi', 'Mehta', 'Nair',
    'Iyer', 'Rao', 'Choudhury', 'Sen', 'Das', 'Roy', 'Mishra', 'Pandey', 'Dubey', 'Trivedi',
    'Bose', 'Mukherjee', 'Chatterjee', 'Deshmukh', 'Kulkarni', 'Patil', 'Pillai', 'Menon', 'Bhat', 'Hegde'
]

CITIES = ['Delhi', 'Mumbai', 'Bangalore', 'Pune', 'Kolkata']

def run_seed():
    print("[SEED_ENGINE] Initiating database cleanup...")
    
    # Cascade deletes to cleanly wipe database before population
    DeliveryLog.objects.all().delete()
    Campaign.objects.all().delete()
    Order.objects.all().delete()
    Shopper.objects.all().delete()
    
    print("[SEED_ENGINE] Clean state established. Generating 100 Shopper profiles...")

    emails_used = set()
    shoppers_created = 0

    while shoppers_created < 100:
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        
        # Ensure unique email addresses
        email = f"{first.lower()}.{last.lower()}{random.randint(10, 9999)}@example.com"
        if email in emails_used:
            continue
            
        emails_used.add(email)
        
        # Realistic Indian mobile carrier formats (+91 9xxx / 8xxx / 7xxx / 6xxx)
        phone = f"+91 {random.choice(['6', '7', '8', '9'])}{random.randint(100000000, 999999999)}"
        city = random.choice(CITIES)

        # Create Shopper record
        shopper = Shopper.objects.create(
            first_name=first,
            last_name=last,
            email=email,
            phone=phone,
            city=city
        )

        # Generate between 1 and 8 orders per shopper profile
        num_orders = random.randint(1, 8)
        for _ in range(num_orders):
            amount = Decimal(str(round(random.uniform(450.00, 12500.00), 2)))
            
            # Purchase date random distribution inside the last 60 days
            days_ago = random.randint(1, 60)
            purchase_date = timezone.now() - timedelta(
                days=days_ago,
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )
            
            Order.objects.create(
                shopper=shopper,
                amount=amount,
                purchase_date=purchase_date
            )

        print(f"[SEED_ENGINE] Created Shopper: {first} {last} from {city} with {num_orders} logged orders.")
        shoppers_created += 1

    print("[SEED_ENGINE] All 100 Shopper and Order records created successfully.")
    print("[SEED_ENGINE] Seeding default outbound outreach Campaigns...")

    # Seed default campaign matrices
    campaign_data = [
        {
            "name": "Delhi VIP Early Access",
            "segment_rules": {"city": "Delhi", "min_spend": 5000},
            "message_template": "Hi [first_name], as a VIP customer in [city], we're giving you exclusive early access to our premium collection! Code: DELHI20"
        },
        {
            "name": "Frequent Buyer Rewards Club",
            "segment_rules": {"min_orders": 4},
            "message_template": "Hi [first_name] [last_name], thank you for your loyalty. Enjoy a special 15% discount on your next order! Code: LOYAL15"
        },
        {
            "name": "Mumbai Retargeting Drive",
            "segment_rules": {"city": "Mumbai"},
            "message_template": "Hello [first_name], special summer deals are now live in [city]! Visit our local store or buy online for free home delivery."
        }
    ]

    for campaign in campaign_data:
        Campaign.objects.create(
            name=campaign["name"],
            segment_rules=campaign["segment_rules"],
            message_template=campaign["message_template"],
            status="PENDING"
        )
        print(f"[SEED_ENGINE] Created Campaign: {campaign['name']}")

    print("[SEED_ENGINE] Database seeding cycle completed successfully.")

if __name__ == '__main__':
    run_seed()
