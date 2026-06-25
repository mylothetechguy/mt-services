#!/usr/bin/env python3
"""
M&T Services — LinkedIn Marketing Agent
Generates daily LinkedIn posts optimized for reach and engagement.

Usage:
    python agents/linkedin_agent.py              # 7 posts starting today
    python agents/linkedin_agent.py --days 30    # full month
    python agents/linkedin_agent.py --today      # single post for today
    python agents/linkedin_agent.py --start-date 2026-07-01 --days 7

Requires:
    pip install anthropic
    export ANTHROPIC_API_KEY=sk-ant-...
"""

import argparse
import json
import os
import sys
from datetime import datetime, timedelta
import random

try:
    import anthropic
except ImportError:
    print("Missing dependency. Run: pip install anthropic")
    sys.exit(1)


# ── Brand context ──────────────────────────────────────────────────────────────

BRAND = {
    "company": "M&T Services",
    "founder": "Myles Wells",
    "tagline": "Websites + AI Employees for Small Business",
    "website": "mtservicesusa.com",
    "phone": "(270) 570-0790",
    "email": "mylothetechguy@gmail.com",
    "location": "Bossier City, LA — serving Louisiana and nationwide",
    "plans": [
        {"name": "Starter", "price": "$149/mo", "includes": "modern website, mobile-first, basic SEO"},
        {"name": "Growth", "price": "$349/mo", "includes": "website + AI assistant + SEO"},
        {"name": "Pro", "price": "$649/mo", "includes": "full website + advanced AI + premium SEO + priority support"},
    ],
    "ai_employee_roles": [
        "AI Receptionist ($349–$649/mo) — answers calls/chats 24/7, books appointments, routes urgent issues",
        "AI Sales Rep ($499–$999/mo) — instant text-back, qualifies leads, follows up until they book",
        "AI Scheduler ($299–$599/mo) — books, confirms, reschedules, sends reminders, fills cancellations",
        "AI Support Agent ($399–$799/mo) — handles FAQs, order status, escalates complex issues",
        "AI Marketing Assistant ($299–$599/mo) — blogs, social posts, Google Business updates, review replies",
        "AI Reputation Manager ($199–$399/mo) — requests reviews, replies to all reviews in brand voice",
    ],
    "founder_story": (
        "Active-duty U.S. Air Force Nuclear Weapons Specialist, Barksdale AFB. "
        "Holds active TOP SECRET/SCI clearance. Led 5 major military programs worth millions in 2 years. "
        "Founded M&T Services to bring military-grade discipline and AI automation to small businesses. "
        "Veteran-owned, mission-driven."
    ),
    "key_value_props": [
        "A part-time hire costs $1,300+/mo before taxes — an AI employee does the same repetitive work for a fraction of that",
        "Works 24/7, never calls in sick, never goes home at 5pm",
        "Month-to-month subscriptions — no contracts, cancel anytime",
        "Live in days, not months",
        "Small businesses can now compete with enterprise companies on response time and availability",
        "Every missed call after hours is a customer who calls your competitor instead",
    ],
    "target_industries": [
        "HVAC, plumbing, electrical, roofing",
        "Dental offices, medical spas, law firms",
        "Real estate agents and property managers",
        "Auto repair and detailing shops",
        "Salons, barbers, gyms, and fitness studios",
        "Restaurants doing catering or reservations",
    ],
    "local_market": "Bossier City, Shreveport, Minden, Natchitoches, and across Louisiana",
    "hashtag_pool": [
        "#AIAutomation", "#SmallBusiness", "#MTServices", "#AIEmployee",
        "#BossierCity", "#Shreveport", "#Louisiana", "#NorthLouisiana",
        "#ArtificialIntelligence", "#BusinessAutomation", "#AIReceptionist",
        "#LocalBusiness", "#VeteranOwned", "#USAF", "#MilitaryEntrepreneur",
        "#Entrepreneur", "#BusinessGrowth", "#SmallBusinessOwner",
        "#LeadGeneration", "#CustomerService", "#WorkSmarter",
        "#AutomateYourBusiness", "#AIForBusiness", "#TechForGood",
    ],
}

# ── Post type rotation (10 types, cycling keeps variety high) ─────────────────

POST_TYPES = [
    {
        "type": "value_prop",
        "guidance": (
            "Show the financial math clearly. Compare the cost of an AI employee "
            "vs. hiring a human. Be specific with numbers. Make it feel like an "
            "obvious decision. Angle from the business owner's pain: payroll, PTO, "
            "turnover, training costs, sick days."
        ),
    },
    {
        "type": "educational",
        "guidance": (
            "Teach ONE specific thing about AI automation that a local small business "
            "owner doesn't know. Avoid jargon. Use an analogy they'll remember. "
            "Something like 'Here's what an AI receptionist actually does when someone "
            "calls your business at 9pm.'"
        ),
    },
    {
        "type": "local_market",
        "guidance": (
            "Target Bossier City, Shreveport, or Louisiana specifically. Name a local "
            "industry or type of business. Make the reader feel seen — speak to their "
            "exact situation. Could reference a common local problem (heat calls at 2am, "
            "Saturday appointment requests, etc.)."
        ),
    },
    {
        "type": "question",
        "guidance": (
            "Ask the audience a question that surfaces their pain point. "
            "Examples: 'How many calls does your business miss after 5pm?' or "
            "'When was the last time a customer couldn't reach you and called your competitor instead?' "
            "Drive comments. End with a follow-up offer."
        ),
    },
    {
        "type": "founder_story",
        "guidance": (
            "Myles' personal story. Pull from his military background (Nuclear Weapons Specialist, "
            "Barksdale AFB, TOP SECRET clearance, leading multi-million-dollar programs). "
            "Connect military discipline / mission focus to how M&T Services operates. "
            "Authentic, personal, no bragging — just honest."
        ),
    },
    {
        "type": "myth_bust",
        "guidance": (
            "Start with a common misconception about AI chatbots or AI employees that "
            "makes business owners hesitant. Then flip it with the reality. "
            "Examples: 'AI sounds robotic and will annoy my customers' or "
            "'My customers won't talk to a bot' or 'AI is only for big companies.'"
        ),
    },
    {
        "type": "cta",
        "guidance": (
            "Direct offer post. Either: free demo (spin up an AI agent that answers "
            "questions about their specific business), free consultation, or highlight "
            "one specific service (AI receptionist, AI reputation manager, etc.). "
            "Include the website mtservicesusa.com and the phone number. "
            "Make the CTA low-risk: 'no commitment, just see it.'"
        ),
    },
    {
        "type": "behind_the_scenes",
        "guidance": (
            "Take people inside the process — what does it actually look like to "
            "build and train a custom AI agent for a local business? What information "
            "do you train it on? How long does it take? What does onboarding look like? "
            "Demystify it. Make it feel accessible and real."
        ),
    },
    {
        "type": "trend",
        "guidance": (
            "Connect a real AI industry trend to what M&T Services does for local businesses. "
            "Frame it as: big companies are already doing this — now small businesses can too. "
            "Examples: the rise of AI receptionists in healthcare, AI in home services, etc."
        ),
    },
    {
        "type": "social_proof",
        "guidance": (
            "Frame a result or outcome as proof. Could be: what happens when a business "
            "installs an AI receptionist (every call answered, appointments booked overnight), "
            "a stat about missed calls costing businesses revenue, or a before/after scenario. "
            "If framing as illustrative, make it feel vivid and real. Focus on the outcome."
        ),
    },
]

# ── Prompts ───────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are a LinkedIn content strategist for M&T Services, a veteran-owned AI automation company based in Bossier City, LA.

Your posts must:
1. Hook in the FIRST LINE — bold statement, surprising stat, or provocative question. No "I" openers.
2. Use short paragraphs (1–3 lines) with a blank line between each — optimized for mobile
3. Deliver clear value or tell a real story
4. End with ONE specific call-to-action
5. Include 5–7 hashtags on the final line (no more)
6. Run 150–280 words total — optimal for LinkedIn reach
7. Sound like a real person: direct, confident, no corporate-speak
8. Use 1–3 emojis maximum, placed where they add emphasis — never decorative filler

Never write:
- Buzzword soup ("leverage synergies," "disruptive innovation ecosystem")
- More than 7 hashtags
- Fake urgency ("Limited time!!!")
- Long intros before getting to the point

Brand voice: Veteran-owned, no-BS, genuinely excited about making AI work for real people running real businesses.\
"""


def build_post_prompt(post_type_obj: dict, post_index: int, used_angles: list) -> str:
    used_str = "\n".join(f"- {a}" for a in used_angles[-6:]) if used_angles else "None yet"
    brand_str = json.dumps(BRAND, indent=2)

    return f"""\
Write a LinkedIn post for M&T Services.

Post category: {post_type_obj['type'].replace('_', ' ').title()}
Post #{post_index} in a content calendar

{post_type_obj['guidance']}

Recent angles already used (DO NOT repeat these):
{used_str}

Brand context:
{brand_str}

Return ONLY the finished post text — no title, no label, no commentary. Ready to paste straight into LinkedIn.\
"""


# ── Generation ────────────────────────────────────────────────────────────────

def generate_post(client: anthropic.Anthropic, post_type_obj: dict, post_index: int, used_angles: list) -> str:
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=700,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": build_post_prompt(post_type_obj, post_index, used_angles)}
        ],
    )
    return message.content[0].text.strip()


def generate_calendar(client: anthropic.Anthropic, start_date: datetime, num_days: int) -> list:
    # Shuffle post types slightly so the rotation doesn't feel mechanical
    types = POST_TYPES.copy()
    first_batch = types[:num_days] if num_days <= len(types) else (types * ((num_days // len(types)) + 1))[:num_days]

    posts = []
    used_angles = []

    for i, pt in enumerate(first_batch):
        date = start_date + timedelta(days=i)
        date_str = date.strftime("%A, %B %d, %Y")
        label = pt["type"].replace("_", " ").title()

        print(f"  [{i+1:02d}/{num_days}] {date_str} — {label}...", end="", flush=True)
        content = generate_post(client, pt, i + 1, used_angles)
        used_angles.append(f"{label}: {content[:80]}...")
        print(" ✓")

        posts.append({
            "index": i + 1,
            "date": date_str,
            "day_of_week": date.strftime("%A"),
            "type": label,
            "content": content,
        })

    return posts


# ── Output ────────────────────────────────────────────────────────────────────

BEST_TIMES = {
    "Monday":    "8:00–9:00 AM CT",
    "Tuesday":   "8:00–10:00 AM CT  ← best day",
    "Wednesday": "8:00–10:00 AM CT",
    "Thursday":  "9:00–10:00 AM CT  ← best day",
    "Friday":    "8:00–9:00 AM CT",
    "Saturday":  "10:00 AM–12:00 PM CT",
    "Sunday":    "12:00–2:00 PM CT (lower reach — consider skipping)",
}


def save_markdown(posts: list, output_path: str, generated_at: datetime):
    lines = [
        "# M&T Services — LinkedIn Content Calendar",
        "",
        f"**Generated:** {generated_at.strftime('%B %d, %Y')}  ",
        f"**Posts:** {len(posts)}  ",
        f"**Range:** {posts[0]['date']} → {posts[-1]['date']}",
        "",
        "---",
        "",
        "## How to use",
        "",
        "1. Copy each post directly into LinkedIn (or paste into Buffer / Hootsuite to schedule in bulk).",
        "2. **Engage within the first 60 minutes** — reply to every comment to boost algorithmic reach.",
        "3. Best posting times on LinkedIn:",
        "",
    ]
    for day, time in BEST_TIMES.items():
        lines.append(f"   - **{day}:** {time}")
    lines += [
        "",
        "4. Add an image or short video to each post to roughly double impressions.",
        "   Suggested: a screenshot of the chat widget, a short screen-record demo, or your headshot.",
        "",
        "---",
        "",
    ]

    for post in posts:
        day_time = BEST_TIMES.get(post["day_of_week"], "8:00–10:00 AM CT")
        lines += [
            f"## Post {post['index']} — {post['date']}",
            f"**Type:** {post['type']}  |  **Best time:** {day_time}",
            "",
            "```",
            post["content"],
            "```",
            "",
            "---",
            "",
        ]

    with open(output_path, "w") as f:
        f.write("\n".join(lines))


def print_post(post: dict):
    print()
    print("─" * 60)
    print(f"  {post['date']}  |  {post['type']}")
    print("─" * 60)
    print(post["content"])
    print("─" * 60)


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="M&T Services LinkedIn Marketing Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--days", type=int, default=7,
        help="Number of posts to generate (default: 7)",
    )
    parser.add_argument(
        "--today", action="store_true",
        help="Generate a single post for today only",
    )
    parser.add_argument(
        "--start-date", type=str, default=None,
        help="Start date in YYYY-MM-DD format (default: today)",
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Output .md file path (default: linkedin_posts_YYYY-MM-DD.md)",
    )
    parser.add_argument(
        "--print-only", action="store_true",
        help="Print posts to terminal without saving a file",
    )
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("\nError: ANTHROPIC_API_KEY is not set.")
        print("  export ANTHROPIC_API_KEY=sk-ant-...")
        print("  Get a key at: https://console.anthropic.com/\n")
        sys.exit(1)

    if args.today:
        args.days = 1

    if args.start_date:
        try:
            start_date = datetime.strptime(args.start_date, "%Y-%m-%d")
        except ValueError:
            print("Error: --start-date must be in YYYY-MM-DD format")
            sys.exit(1)
    else:
        start_date = datetime.now()

    output_path = args.output or f"linkedin_posts_{start_date.strftime('%Y-%m-%d')}.md"

    print()
    print("M&T Services — LinkedIn Marketing Agent")
    print("=" * 45)
    print(f"Posts to generate : {args.days}")
    print(f"Start date        : {start_date.strftime('%B %d, %Y')}")
    if not args.print_only:
        print(f"Output file       : {output_path}")
    print()

    client = anthropic.Anthropic(api_key=api_key)
    posts = generate_calendar(client, start_date, args.days)

    if args.print_only or args.today:
        for post in posts:
            print_post(post)
    else:
        save_markdown(posts, output_path, datetime.now())
        print(f"\nSaved → {output_path}")

    print("\nDone. Post consistently — LinkedIn rewards accounts that show up daily.")
    print("Tip: reply to every comment in the first hour to maximize reach.\n")


if __name__ == "__main__":
    main()
