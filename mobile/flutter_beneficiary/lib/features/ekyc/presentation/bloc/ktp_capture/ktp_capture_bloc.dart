import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import 'ktp_capture_event.dart';
import 'ktp_capture_state.dart';

class KtpCaptureBloc extends Bloc<KtpCaptureEvent, KtpCaptureState> {
  KtpCaptureBloc() : super(const KtpCaptureInitial()) {
    on<KtpCaptureStarted>(_onStarted);
    on<KtpCaptureTakePhoto>(_onTakePhoto);
    on<KtpCaptureUploadSuccess>(_onUploadSuccess);
    on<KtpCaptureUploadFailure>(_onUploadFailure);
  }

  FutureOr<void> _onStarted(
    KtpCaptureStarted event,
    Emitter<KtpCaptureState> emit,
  ) {
    emit(const KtpCaptureInitial());
  }

  FutureOr<void> _onTakePhoto(
    KtpCaptureTakePhoto event,
    Emitter<KtpCaptureState> emit,
  ) async {
    emit(KtpCaptureInProgress(photoPath: state.photoPath));
    await Future<void>.delayed(const Duration(seconds: 1));
    emit(const KtpCaptureSuccess(photoPath: 'ktp_photo.jpg'));
  }

  FutureOr<void> _onUploadSuccess(
    KtpCaptureUploadSuccess event,
    Emitter<KtpCaptureState> emit,
  ) {
    emit(KtpCaptureSuccess(photoPath: event.photoPath));
  }

  FutureOr<void> _onUploadFailure(
    KtpCaptureUploadFailure event,
    Emitter<KtpCaptureState> emit,
  ) {
    emit(KtpCaptureFailure(event.message, photoPath: state.photoPath));
  }
}
