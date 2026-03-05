"""
Script para limpiar todos los datos de prueba de la base de datos.

ADVERTENCIA: Este script eliminará TODOS los casos y versiones de casos.
Los usuarios y cohortes NO serán eliminados para preservar la estructura de la plataforma.

Uso:
    python clear_test_data.py

Opciones:
    --force: Ejecutar sin confirmación interactiva
    --keep-admin: Mantener solo el usuario admin (eliminar todos los demás usuarios)
"""

import argparse
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.app.db import get_session
from backend.app.models import Case, CaseVersion, User, Cohort, CohortMembership, UserRole
from sqlmodel import select, delete


def clear_test_data(session, keep_users: bool = True, keep_admin_only: bool = False):
    """Clear all test data from database"""
    
    print("\n" + "="*60)
    print("🗑️  LIMPIEZA DE DATOS DE PRUEBA")
    print("="*60 + "\n")

    # 1. Delete all case versions
    print("📦 Eliminando versiones de casos...")
    versions_stmt = select(CaseVersion)
    versions = session.exec(versions_stmt).all()
    version_count = len(versions)
    
    if version_count > 0:
        delete_stmt = delete(CaseVersion)
        session.exec(delete_stmt)
        print(f"   ✅ {version_count} versiones eliminadas")
    else:
        print("   ℹ️  No hay versiones de casos")

    # 2. Delete all cases
    print("\n📋 Eliminando casos...")
    cases_stmt = select(Case)
    cases = session.exec(cases_stmt).all()
    case_count = len(cases)
    
    if case_count > 0:
        delete_stmt = delete(Case)
        session.exec(delete_stmt)
        print(f"   ✅ {case_count} casos eliminados")
    else:
        print("   ℹ️  No hay casos")

    # 3. Optionally delete memberships
    if not keep_users or keep_admin_only:
        print("\n👥 Eliminando membresías...")
        memberships_stmt = select(CohortMembership)
        memberships = session.exec(memberships_stmt).all()
        membership_count = len(memberships)
        
        if membership_count > 0:
            delete_stmt = delete(CohortMembership)
            session.exec(delete_stmt)
            print(f"   ✅ {membership_count} membresías eliminadas")
        else:
            print("   ℹ️  No hay membresías")

    # 4. Optionally delete non-admin users
    if keep_admin_only:
        print("\n👤 Eliminando usuarios no-admin...")
        users_stmt = select(User).where(User.role != UserRole.ADMIN)
        users = session.exec(users_stmt).all()
        user_count = len(users)
        
        if user_count > 0:
            for user in users:
                session.delete(user)
            print(f"   ✅ {user_count} usuarios no-admin eliminados")
        else:
            print("   ℹ️  No hay usuarios no-admin")

    # Commit all changes
    session.commit()

    print("\n" + "="*60)
    print("✅ LIMPIEZA COMPLETADA")
    print("="*60 + "\n")

    # Summary
    print("📊 Resumen:")
    print(f"   • Versiones eliminadas: {version_count}")
    print(f"   • Casos eliminados: {case_count}")
    
    if not keep_users or keep_admin_only:
        print(f"   • Membresías eliminadas: {membership_count if 'membership_count' in locals() else 0}")
    
    if keep_admin_only:
        print(f"   • Usuarios no-admin eliminados: {user_count if 'user_count' in locals() else 0}")

    # What's preserved
    print("\n💾 Preservado:")
    remaining_users = session.exec(select(User)).all()
    remaining_cohorts = session.exec(select(Cohort)).all()
    print(f"   • Usuarios: {len(remaining_users)}")
    print(f"   • Cohortes: {len(remaining_cohorts)}")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Limpiar datos de prueba de la base de datos"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Ejecutar sin confirmación"
    )
    parser.add_argument(
        "--keep-admin",
        action="store_true",
        help="Mantener solo el usuario admin (eliminar todos los demás usuarios)"
    )
    
    args = parser.parse_args()

    # Confirmation prompt
    if not args.force:
        print("\n⚠️  ADVERTENCIA: Este script eliminará todos los casos y versiones de casos.")
        if args.keep_admin:
            print("   También eliminará todos los usuarios excepto el admin.")
        print("\n¿Estás seguro de que deseas continuar? (escribe 'ELIMINAR' para confirmar)")
        
        confirmation = input("\n> ").strip()
        
        if confirmation != "ELIMINAR":
            print("\n❌ Operación cancelada")
            return

    # Execute cleanup
    session = next(get_session())
    
    try:
        clear_test_data(
            session, 
            keep_users=not args.keep_admin,
            keep_admin_only=args.keep_admin
        )
    except Exception as exc:
        session.rollback()
        print(f"\n❌ Error durante la limpieza: {exc}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
