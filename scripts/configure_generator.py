"""Ввести ключ AITUNNEL скрыто и сохранить только в игнорируемом .env."""
import getpass
from pathlib import Path


def main():
    target = Path(__file__).resolve().parent.parent / ".env"
    key = getpass.getpass("AITUNNEL API key (hidden): ").strip()
    if not key:
        print("Empty key: nothing changed.")
        return
    if any(char in key for char in ("\n", "\r", "\0")):
        raise SystemExit("Invalid key.")
    lines = target.read_text(encoding="utf-8-sig").splitlines() if target.exists() else []
    lines = [line for line in lines if not line.strip().startswith("GEN_API_KEY=")]
    lines.append("GEN_API_KEY=" + key)
    if not any(line.strip().startswith("GEN_MODEL=") for line in lines):
        lines.append("GEN_MODEL=gpt-4.1-mini")
    target.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Key saved to .env. The server reads it automatically; restart is not needed.")


if __name__ == "__main__":
    main()
