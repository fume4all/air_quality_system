from database import engine
from sqlalchemy import text

with engine.begin() as conn:

    result = conn.execute(
        text("""
            SELECT device_id, COUNT(*)
            FROM air_quality_readings
            GROUP BY device_id
        """)
    )

    print("Current records:")
    for row in result:
        print(row)

    # Preview unwanted records
    count = conn.execute(
        text("""
            SELECT COUNT(*)
            FROM air_quality_readings
            WHERE device_id = :device_id
        """),
        {"device_id": "string"}
    ).scalar()

    print("Unwanted records:", count)

    # Only delete after explicit confirmation
    if input("Delete these records? Type DELETE: ") == "DELETE":
        deleted = conn.execute(
            text("""
                DELETE FROM air_quality_readings
                WHERE device_id = :device_id
            """),
            {"device_id": "string"}
        )
        print("Deleted records:", deleted.rowcount)
    else:
        print("No records deleted.")