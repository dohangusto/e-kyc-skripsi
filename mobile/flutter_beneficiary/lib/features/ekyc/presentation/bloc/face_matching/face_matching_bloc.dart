import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import 'face_matching_event.dart';
import 'face_matching_state.dart';

class FaceMatchingBloc extends Bloc<FaceMatchingEvent, FaceMatchingState> {
  FaceMatchingBloc() : super(const FaceMatchingInitial()) {
    on<FaceMatchingStarted>(_onStarted);
    on<FaceMatchingTakeSelfie>(_onTakeSelfie);
    on<FaceMatchingUploadSubmitted>(_onUploadSubmitted);
  }

  FutureOr<void> _onStarted(
    FaceMatchingStarted event,
    Emitter<FaceMatchingState> emit,
  ) {
    emit(const FaceMatchingInitial());
  }

  FutureOr<void> _onTakeSelfie(
    FaceMatchingTakeSelfie event,
    Emitter<FaceMatchingState> emit,
  ) async {
    emit(FaceMatchingUploading(photoPath: state.photoPath));
    await Future<void>.delayed(const Duration(seconds: 1));
    emit(const FaceMatchingUploaded(photoPath: 'selfie_with_ktp.jpg'));
  }

  FutureOr<void> _onUploadSubmitted(
    FaceMatchingUploadSubmitted event,
    Emitter<FaceMatchingState> emit,
  ) {
    emit(FaceMatchingUploaded(photoPath: event.photoPath ?? state.photoPath));
  }
}
