from args import get_args
from Scanner import Scanner

ARGS = get_args()
NUM_POSTS_TO_SCAN = 10
# 6 hours = 21600, must be larger than sum of the average runtime and the
# cumulative average runtime
SCANNER_INTERVAL_SEC = 1200
DEBUG_POSTS_TO_SCAN = ARGS.posts
DEBUG_SLEEP_TIME = 30
scanner_list = []

# Subreddits added to this list will be automatically added to the list of scanners.
subreddit_list = [
    "learnpython",
    "baking",
    "AskBaking",
    "chefit",
    "breadit",
    "learnprogramming",
    "AskReddit",
    "AskScience",
    "AskHistorians",
    "AskWomen",
    "AskMen",
    "AskCulinary",
    "TrueAskReddit",
    "AskSocialScience",
    "AskEngineers",
    "AskPhilosophy",
    "AskScienceFiction",
    "Ask_Politics",
    "AskAcademia",
    "AskElectronics",
    "AskTransgender",
    "AskComputerScience",
    "AskDrugs",
    "AskFeminists",
    "AskPhotography",
    "AskUk",
    "AskModerators",
]


def build_scanner_list():
    scanner_class_builder = {
        name: Scanner(
            sub_name=name,
            bot_name="CookingStatsBot",
            num_posts_to_scan=NUM_POSTS_TO_SCAN,
            interval_sec=SCANNER_INTERVAL_SEC
        ) for name in subreddit_list
    }

    for sub in subreddit_list:
        scanner_list.append(scanner_class_builder[sub])


def get_scanner_list() -> list[Scanner]:
    return scanner_list


def first_pass_completed() -> bool:
    for scanner in scanner_list:
        if not scanner.first_pass_done:
            return False

    return True


def get_cumulative_avg_runtime() -> float:
    cumulative_avg_runtime = 0

    for scanner in scanner_list:
        if scanner.first_pass_done:
            avg_runtime = scanner.get_avg_runtime_seconds()
            cumulative_avg_runtime += avg_runtime

    return cumulative_avg_runtime