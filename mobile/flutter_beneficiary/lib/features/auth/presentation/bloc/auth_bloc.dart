import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc() : super(const AuthState()) {
    on<AuthCheckRequested>(_onAuthCheckRequested);
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

  FutureOr<void> _onAuthLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(state.copyWith(status: AuthStatus.loading));

    // TODO: nanti panggil usecase/repository ke backend
    // Sekarang: delay dikit buat simulasi
    await Future<void>.delayed(const Duration(seconds: 1));

    // Dummy: anggap login selalu sukses
    emit(
      state.copyWith(status: AuthStatus.authenticated, userId: 'dummy-user-id'),
    );
  }

  FutureOr<void> _onAuthLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    // TODO: hapus token, dsb.
    emit(state.copyWith(status: AuthStatus.unauthenticated, userId: null));
  }
}
