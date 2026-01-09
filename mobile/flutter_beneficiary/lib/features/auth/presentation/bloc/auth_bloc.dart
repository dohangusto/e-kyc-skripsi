import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc() : super(const AuthState()) {
    on<AuthCheckRequested>(_onAuthCheckRequested);
    on<AuthEligibilitySubmitted>(_onAuthEligibilitySubmitted);
    on<AuthLoginRequested>(_onAuthLoginRequested);
    on<AuthLogoutRequested>(_onAuthLogoutRequested);
  }

  FutureOr<void> _onAuthCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    // TODO: nanti cek token/login state di local storage
    // Untuk sekarang, anggap user belum login
    emit(state.copyWith(status: AuthStatus.unauthenticated));
  }

  FutureOr<void> _onAuthEligibilitySubmitted(
    AuthEligibilitySubmitted event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(status: AuthStatus.loading));

    // TODO: nanti panggil usecase/repository ke backend
    // Sekarang: delay dikit buat simulasi
    await Future<void>.delayed(const Duration(seconds: 1));

    // Dummy: anggap cek kelayakan selalu sukses
    emit(
      state.copyWith(
        status: AuthStatus.authenticated,
        userId: 'dummy-user-id',
        nik: event.nik,
        name: event.name,
      ),
    );
  }

  FutureOr<void> _onAuthLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(status: AuthStatus.loading, errorMessage: null));
    await Future<void>.delayed(const Duration(milliseconds: 800));
    emit(
      state.copyWith(
        status: AuthStatus.authenticated,
        userId: event.phone,
        errorMessage: null,
      ),
    );
  }

  FutureOr<void> _onAuthLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    // TODO: hapus token, dsb.
    emit(
      state.copyWith(
        status: AuthStatus.unauthenticated,
        userId: null,
        nik: null,
        name: null,
      ),
    );
  }
}
